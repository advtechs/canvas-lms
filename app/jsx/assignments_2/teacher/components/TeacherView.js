/*
 * Copyright (C) 2018 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import I18n from 'i18n!assignments_2'
import {Mutation} from 'react-apollo'
import classnames from 'classnames'
import produce from 'immer'
import get from 'lodash/get'
import set from 'lodash/set'

import {showFlashAlert} from 'jsx/shared/FlashAlert'

import {Alert} from '@instructure/ui-alerts'
import {Mask} from '@instructure/ui-overlays'
import {Portal} from '@instructure/ui-portal'
import {ScreenReaderContent} from '@instructure/ui-a11y'
import {Spinner, Text} from '@instructure/ui-elements'

import {TeacherAssignmentShape, SAVE_ASSIGNMENT} from '../assignmentData'
import Header from './Header'
import ContentTabs from './ContentTabs'
import TeacherFooter from './TeacherFooter'

import ConfirmDialog from './ConfirmDialog'
import MessageStudentsWhoDialog from './MessageStudentsWhoDialog'
import TeacherViewContext, {TeacherViewContextDefaults} from './TeacherViewContext'

export default class TeacherView extends React.Component {
  static propTypes = {
    assignment: TeacherAssignmentShape
  }

  constructor(props) {
    super(props)
    this.state = {
      messageStudentsWhoOpen: false,
      sendingMessageStudentsWhoNow: false,
      confirmDelete: false,
      deletingNow: false,
      workingAssignment: props.assignment, // the assignment with updated fields while editing
      isDirty: false, // has the user changed anything?
      isSaving: false, // is save assignment in-flight?
      isUnpublishing: false, // is saving just the unpublished state in-flight?
      // for now, put "#edit" in the URL and it will turn off readOnly
      readOnly: window.location.hash.indexOf('edit') < 0
    }

    // TODO: reevaluate if the context is still needed. <FriendlyDateTime> pulls the data
    // directly from ENV, so unless its replacement is different, this might be unnecessary.
    this.contextValue = {
      locale: (window.ENV && window.ENV.MOMENT_LOCALE) || TeacherViewContextDefaults.locale,
      timeZone: (window.ENV && window.ENV.TIMEZONE) || TeacherViewContextDefaults.timeZone
    }
  }

  // @param value: the new value. may be a scalar, an array, or an object.
  // @param path: where w/in the assignment it should go. May be a string representing
  //     the dot-separated path (e.g. 'assignmentOverrides.nodes.0`) or an array
  //     of steps (e.g. ['assignmentOverrides', 'nodes', 0] (which could also be '0'))
  updateWorkingAssignment(path, value) {
    const dottedpath = Array.isArray(path) ? path.join('.') : path
    const old = get(this.state.workingAssignment, dottedpath)
    if (old === value) {
      return this.state.workingAssignment
    }
    const updatedAssignment = produce(this.state.workingAssignment, draft => {
      set(draft, path, value)
    })
    return updatedAssignment
  }

  // if the new value is different from the existing value, update TeacherView's react state
  handleChangeAssignment = (path, value) => {
    const updatedAssignment = this.updateWorkingAssignment(path, value)
    if (updatedAssignment !== this.state.workingAssignment) {
      this.setState({workingAssignment: updatedAssignment, isDirty: true})
    }
  }

  handleUnsubmittedClick = () => {
    this.setState({messageStudentsWhoOpen: true})
  }

  handleCloseMessageStudentsWho = () => {
    this.setState({messageStudentsWhoOpen: false, sendingMessageStudentsWhoNow: false})
  }

  handleDeleteButtonPressed = () => {
    this.setState({confirmDelete: true})
  }

  handleCancelDelete = () => {
    this.setState({confirmDelete: false})
  }

  handleReallyDelete(deleteAssignment) {
    this.setState({deletingNow: true})
    deleteAssignment({
      variables: {
        id: this.props.assignment.lid,
        state: 'deleted'
      }
    })
  }

  handleDeleteSuccess = () => {
    // reloading a deleted assignment has the effect of redirecting to the
    // assignments index page with a flash message indicating the assignment
    // has been deleted.
    window.location.reload()
  }

  handleDeleteError = apolloErrors => {
    showFlashAlert({
      message: I18n.t('Unable to delete assignment'),
      err: new Error(apolloErrors),
      type: 'error'
    })
    this.setState({confirmDelete: false, deletingNow: false})
  }

  handleCancel = () => {
    this.setState({workingAssignment: this.props.assignment, isDirty: false})
  }

  handleSave(saveAssignment) {
    this.setState({isSaving: true}, () => {
      const assignment = this.state.workingAssignment
      saveAssignment({
        variables: {
          id: assignment.lid,
          name: assignment.name,
          description: assignment.description,
          state: assignment.state,
          // ,dueAt: assignment.due_at,
          pointsPossible: assignment.pointsPossible
        }
      })
    })
  }

  // if the last save was just to unpublish,
  // then we don't change the isDirty state
  handleSaveSuccess = () => {
    this.setState((state, _props) => ({
      isSaving: false,
      isUnpublishing: false,
      isDirty: state.isUnpublishing ? state.isDirty : false
    }))
  }

  handleSaveError = apolloErrors => {
    // TODO: something better
    showFlashAlert({
      message: I18n.t('An error occured saving the assignment'),
      err: new Error(apolloErrors),
      type: 'error'
    })
    this.setState({isSaving: false})
  }

  handlePublish(saveAssignment) {
    // while the user can unpublish w/o saving anything,
    // publishing implies saving and pending edits.
    const updatedAssignment = this.updateWorkingAssignment('state', 'published')
    if (updatedAssignment !== this.state.workingAssignment) {
      this.setState({workingAssignment: updatedAssignment}, () => this.handleSave(saveAssignment))
    }
  }

  deleteDialogButtonProps = deleteAssignment => [
    {
      children: I18n.t('Cancel'),
      onClick: this.handleCancelDelete,
      'data-testid': 'delete-dialog-cancel-button'
    },
    {
      children: I18n.t('Delete'),
      variant: 'danger',
      onClick: () => this.handleReallyDelete(deleteAssignment),
      'data-testid': 'delete-dialog-confirm-button'
    }
  ]

  renderDeleteDialogBody = () => (
    <Alert variant="warning">
      <Text size="large">{I18n.t('Are you sure you want to delete this assignment?')}</Text>
    </Alert>
  )

  handleSetWorkstate(saveAssignment, newState) {
    const updatedAssignment = this.updateWorkingAssignment('state', newState)
    this.setState(
      {
        workingAssignment: updatedAssignment,
        isSaving: true
      },
      () => {
        if (newState === 'unpublished') {
          // just update the state
          this.setState({isSaving: true, isUnpublishing: true}, () => {
            saveAssignment({
              variables: {
                id: this.state.workingAssignment.lid,
                state: this.state.workingAssignment.state
              }
            })
          })
        } else {
          // save everything
          this.handleSave(saveAssignment)
        }
      }
    )
  }

  renderDeleteDialog() {
    return (
      <Mutation
        mutation={SAVE_ASSIGNMENT}
        onCompleted={this.handleDeleteSuccess}
        onError={this.handleDeleteError}
      >
        {deleteAssignment => (
          <ConfirmDialog
            open={this.state.confirmDelete}
            working={this.state.deletingNow}
            disabled={this.state.deletingNow}
            modalLabel={I18n.t('confirm delete')}
            heading={I18n.t('Delete')}
            body={this.renderDeleteDialogBody}
            buttons={() => this.deleteDialogButtonProps(deleteAssignment)}
            spinnerLabel={I18n.t('deleting assignment')}
            onDismiss={this.handleCancelDelete}
          />
        )}
      </Mutation>
    )
  }

  renderMessageStudentsWhoDialog = () => (
    <MessageStudentsWhoDialog
      assignment={this.props.assignment}
      open={this.state.messageStudentsWhoOpen}
      busy={this.state.sendingMessageStudentsWhoNow}
      onClose={this.handleCloseMessageStudentsWho}
      onSend={this.handleSendMessageStudentsWho}
    />
  )

  render() {
    const dirty = this.state.isDirty
    const assignment = this.state.workingAssignment
    const clazz = classnames('assignments-teacher', {dirty})
    return (
      <TeacherViewContext.Provider value={this.contextValue}>
        <div className={clazz}>
          {this.renderDeleteDialog()}
          <ScreenReaderContent>
            <h1>{assignment.name}</h1>
          </ScreenReaderContent>
          <Mutation
            mutation={SAVE_ASSIGNMENT}
            onCompleted={this.handleSaveSuccess}
            onError={this.handleSaveError}
          >
            {saveAssignment => (
              <React.Fragment>
                <Header
                  assignment={assignment}
                  onChangeAssignment={this.handleChangeAssignment}
                  onSetWorkstate={newState => this.handleSetWorkstate(saveAssignment, newState)}
                  onUnsubmittedClick={this.handleUnsubmittedClick}
                  onDelete={this.handleDeleteButtonPressed}
                  readOnly={this.state.readOnly}
                />
                <ContentTabs
                  assignment={assignment}
                  onChangeAssignment={this.handleChangeAssignment}
                  readOnly={this.state.readOnly}
                />
                {this.renderMessageStudentsWhoDialog()}
                {dirty ? (
                  <TeacherFooter
                    onCancel={this.handleCancel}
                    onSave={() => this.handleSave(saveAssignment)}
                    onPublish={() => this.handlePublish(saveAssignment)}
                  />
                ) : null}
              </React.Fragment>
            )}
          </Mutation>
          <Portal open={this.state.isSaving}>
            <Mask fullscreen>
              <Spinner size="large" title={I18n.t('Saving assignment')} />
            </Mask>
          </Portal>
        </div>
      </TeacherViewContext.Provider>
    )
  }
}
