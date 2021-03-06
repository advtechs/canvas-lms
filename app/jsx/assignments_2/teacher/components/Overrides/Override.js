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
import {bool, func, number} from 'prop-types'
import I18n from 'i18n!assignments_2'
import {OverrideShape} from '../../assignmentData'
import ToggleGroup from '@instructure/ui-toggle-details/lib/components/ToggleGroup'
import View from '@instructure/ui-layout/lib/components/View'
import OverrideSummary from './OverrideSummary'
import OverrideDetail from './OverrideDetail'

Override.propTypes = {
  override: OverrideShape.isRequired,
  onChangeOverride: func.isRequired,
  index: number.isRequired, // offset of this override in the assignment
  readOnly: bool
}
Override.defaultProps = {
  readOnly: true
}

export default function Override(props) {
  return (
    <View as="div" margin="0 0 small 0" data-testid="Override">
      <ToggleGroup
        toggleLabel={I18n.t('Expand')}
        summary={<OverrideSummary override={props.override} />}
        background="default"
      >
        <OverrideDetail
          override={props.override}
          onChangeOverride={onChangeOverride}
          readOnly={props.readOnly}
        />
      </ToggleGroup>
    </View>
  )

  function onChangeOverride(path, value) {
    props.onChangeOverride(props.index, path, value)
  }
}
