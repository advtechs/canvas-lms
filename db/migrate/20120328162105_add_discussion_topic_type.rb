#
# Copyright (C) 2012 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.

class AddDiscussionTopicType < ActiveRecord::Migration[4.2]
  tag :predeploy

  # rubocop:disable Migration/RemoveColumn
  def self.up
    remove_column :discussion_topics, :threaded
    add_column :discussion_topics, :discussion_type, :string
  end

  def self.down
    remove_column :discussion_topics, :discussion_type
    add_column :discussion_topics, :threaded, :boolean
  end
end
