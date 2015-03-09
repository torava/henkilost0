/**
 * @file editabletable.js
 * @fileOverview A plugin for making HTML tables editable.
 * @author Teemu Orava
 * @copyright Teemu Orava 2015
 * @version 1.0
 * @requires jquery.js
 * @requires jquery.sortElements.js
 * @requires jquery.ui.js
 * @requires bootstrap.js
 */

// 2015-03-09 18:41:00

/**
 * a namespace for editable table
 * @namespace teemu
*/

String.prototype.repeat = function(n) {
	return Array(n+1).join(this);
}
if (!HTMLFormElement.prototype.reportValidity) {
	HTMLFormElement.prototype.reportValidity = function() {
		var $form = $(this).parents('form:eq(0)');
		if (!$form.find('input:invalid').length) return;
		$form.append('<input type="submit" style="display:none"/>').find('input[type=submit]').click().remove();
	}
}
;(function($) {
	/**
	 * @module editableTable
	 * @class 
	 */
	$.widget("teemu.editabletable", {
		options: {
			/**
			 * make all columns required
			 * @type {Boolean}
			 * @member 
			 * @memberof editableTable
			 */
			requireAll: true,
			/**
			 * @member
			 * @memberof editableTable
			 * @type {Function}
			 */
			confirm_delete_msg: function(row) {
				return "Haluatko varmasti poistaa rivin?";
			},
			/**
			 * @member
			 * @memberof editableTable
			 * @type {Object}
			 */
			action_columns: {
				editing: '<a href="#" class="editable-save">tallenna</a>&nbsp;'+
						 '<a href="#" class="editable-cancel">peruuta</a>',
				new:	 '<a href="#" class="editable-add">lisää</a>',
				default: '<a href="#" class="editable-edit">muokkaa</a>&nbsp;'+
						 '<a href="#" class="editable-delete">poista</a>'
			}
		},
		_new_index: 1,
		/**
		 * Prepares table and sets events. Called on widget creation.
		 * @memberof editableTable
		 */
		_create: function() {
			var that = this;
			
			this.element.addClass('table table-striped');

			$(window).on('resize', function() { that._updateLayout.call(that) });

			// an unexpainable bug fix for Chrome to prevent form submit
			history.pushState && history.pushState(null, null, '?#');

			this._on(this.element, {
				'click .editable-edit': this._editRow,
				// trigger change event on input change
				'change input': function(event) {
					that._trigger('change', event)
				},
				// disable links
				'click a': function(e) {
					e.preventDefault();
					$(e.target).blur();
				},
				// save changes and restore row when Save is clicked
			 	'click .editable-save': function(e) {
					that._restoreRow.call(that, e, true)
				},
				// also when enter is pressed in input
				'keypress tr:not(.editable-new-row) input': function(e) {
					e.keyCode == 13 && that._restoreRow.call(that, e, true)
				},
				// save new row and add second one from template when Add is clicked
				'click .editable-new-row .editable-add': function(e) {
					that._restoreRow.call(that, e, true) && that._addNewRow.call(that)
				},
				// also when enter is pressed
				'keypress tr.editable-new-row input': function(e) {
					e.keyCode == 13 && that._restoreRow.call(that, e, true) && that._addNewRow.call(that)
				},
				// sort table when column header is clicked
				'click th': function(e) {
					that.sort.call(that, $(e.target).index())
				},
				// restore row when Cancel is clicked
				'click .editable-cancel': this._restoreRow,
				// attempt row deletion when Delete is clicked
				'click .editable-delete': this._deleteRow,
				// prevent form submit
				'submit form': function(e) {
					e.preventDefault();
				}
			})
		},
		/**
		 * Sorts table according to specified column.
		 * @param {Integer}
		 * @memberof editableTable
		 */
		sort: function(column_index) {
			var that = this,
				headers = this.element.find('th');

			if (headers.eq(column_index).hasClass('editable-sorted-asc')) {
				var order = -1;
			}
			else if (headers.eq(column_index).hasClass('editable-sorted-desc')) {
				var unsorted = true;
			}
			else {
				order = 1;
			}
			this.element.find('.editable-sorted-asc').removeClass('editable-sorted-asc');
			this.element.find('.editable-sorted-desc').removeClass('editable-sorted-desc');
			if (!unsorted) {
				headers.eq(column_index).addClass(order === 1 ? 'editable-sorted-asc' : 'editable-sorted-desc');
			}

			// to restore unsorted state sort by row index numbers
			if (unsorted) {
				this.element.find('tbody > tr').sortElements(function(a, b) {
					return $(a).data('i') > $(b).data('i') ? 1 : -1
				})
			}
			// else sort by column values
			else {
				var at, bt;
				this.element.find('tbody td').filter(function() { return $(this).index() == column_index })
				.sortElements(function(a, b) {
					at = $(a).data('value');
					at = at && at.toLowerCase();
					bt = $(b).data('value');
					bt = bt && bt.toLowerCase();

					return (at == bt ?
						   $(a).parents('tr').data('i') > $(b).parents('tr').data('i') ? 1 : -1 :
						   at > bt ? 1 : -1)*order;
				}, function() {
					return this.parentNode;
				})
			}
		},
		/**
		 * Sets a new value for speficied cell element.
		 * @param {Object} - cell element
		 * @param {String} - value to set
		 * @param {Boolean} [skip_validation=false]
		 * @return {Boolean} returns true on success
		 * @memberof editableTable
		 */
		setValue: function(cell, value, skip_validation) {
			if (skip_validation) validated = value;
			else {
				var validated = this._validateValue(value, this.structure[i]);
				if (validated === false) return;
			}
			var row = cell.parent();
			if (row.hasClass('editable-editing')) {
				cell.find('input').val(validated);
			}
			else {
				cell.text(validated);
			}
			return true;
		},
		/**
		 * Updates table layout for windows size.
		 * @memberof editableTable
		*/
		_updateLayout: function() {
			// adjust header widths to match content
			var columns = $('tbody:eq(0) > tr:eq(0) > td', this.element);
			$('th', this.element).each(function(i) {
				$(this).css('width', columns.eq(i).outerWidth()+'px');
			})
		},
		/**
		 * Deletes a row refered by event parameter. Confirms before deletion.
		 * @param {Object}
		 * @memberof editableTable
		 */
		_deleteRow: function(event) {
			var row = $(event.target);
			// find row element if needed
			if (!row.is('tr')) {
				row = row.parents('tr');
				if (!row.length) return;
			}
			// ask confirmation using message specified in options
			var	ask = confirm(this.options.confirm_delete_msg(row));
			if (ask) {
				row.remove();
			}
		},
		/**
		 * Prepares a row for editing.
		 * @param {Object}
		 * @param {Object}
		 * @param {Boolean} [is_new_row=false] - is a new row
		 * @memberof editableTable
		 */
		_editRow: function(event, row, is_new_row) {
			if (!row) {
				var row = $(event.target),
					that = this;
				if (!row.is('tr')) {
					row = row.parents('tr');
					if (!row.length) return;
				}
			}
			row.addClass('editable-editing');
			var columns = row.children(),
				that = this,
				action_column = $([].pop.call(columns));
			columns.each(function() {
				var text = $(this).data('value'),
					attr = that.structure[$(this).index()];

				$(this).html("<form><input/></form>").find('input').eq(0).attr({
					placeholder: attr.title,
					value: text,
					required: that.options.requireAll,
					type: attr.type || "text"
				});
			})
			action_column.html(that.options.action_columns[is_new_row ? "new" : "editing"]);
		},
		/**
		 * Validates a value using column validation.
		 * @param {String} - value to validate
		 * @param {Object} - column attributes
		 * @return {String/Boolean} returns validated value on success, otherwise false
		 * @memberof editableTable
		 */
		_validateValue: function(value, attr) {
			if ((this.options.requireAll || attr.required) && !value) {
				return false;
			}
			if (attr.validation) {
				var validated = attr.validation(value);
				if (validated === false) {
					return false;
				}
				else return validated;
			}
			return value;
		},
		/**
		 * Restores a row to view mode.
		 * @param {Object}
		 * @param {Boolean} [save=false] - are changes saved
		 * @return {Boolean} returns true on success
		 * @memberof editableTable
		 */
		_restoreRow: function(event, save) {
			var row = $(event.target);
			if (!row.is('tr')) {
				row = row.parents('tr');
				if (!row.length) return;
			}
			var columns = row.children(),
				that = this,
				attr = that.structure,
				action_column = $([].pop.call(columns)),
				invalid = false;
			if (save) {
				that._trigger('validate', event);
				columns.each(function(k,v) {
					var input = $(this).find('input').eq(0),
						validated = that._validateValue.call(that, input.val(), attr[k]);
					if (validated === false || input.is(':invalid')) {
						input[0].setCustomValidity(!input.val() && input.attr('required') ? '' : input.attr('validationMessage'));

						// fire validation check for the first element
						// polyfill inspired by http://tjvantoll.com/2015/01/28/reportvalidity/
						if (!invalid) {
							input.parent()[0].reportValidity();
						}

						invalid = true;
					}
					else {
						input[0].setCustomValidity('');
						input.val(validated);
					}
				})
				if (invalid) return;
				columns.each(function(k,v) {
					var value = $(this).find('input').eq(0).val();
					$(this).text(attr[k].format ?
								 attr[k].format(value) :
								 value)
					.data('value', value);
				})
			}
			else {
				columns.each(function(k,v) {
					var value = $(this).data('value');
					$(this).text(attr[k].format ?
								 attr[k].format(value) :
								 value)
				})
			}
			row.removeClass('editable-editing');
			if (row.hasClass('editable-new-row')) {
				row.removeClass('editable-new-row');
				window.location = '#'+row.attr('id');
			}	
			action_column.html(that.options.action_columns.default);
			return true;
		},
		/**
		 * appends a new row from the template
		 * @memberof editableTable
		 */
		_addNewRow: function() {
			this.new_row_template = $('.editable-new-row-template', this.element);
			var new_row = this.new_row_template.clone()
			.removeClass('editable-new-row-template')
			.addClass('editable-new-row')
			.css('display', '')
			.appendTo(this.element.find('tbody:eq(0)'))
			this._editRow.call(this, false, new_row, true);
			var id = this.element.attr('id')+'-newrow-'+(this._new_index++);
			new_row.attr('id', id)
			.data('i', this.element.find('tbody tr').length-1)
			.find('input:eq(0)').focus();
		},
		/**
		 * Sets table content from an object. Provides a simple option for transferring data from other system.
		 * @param {Object} - an object containing new structure and data
		 * @memberof editableTable
		 */
		importFromObject: function(content) {
			var html = "",
				structure = content.structure,
				data = content.data;
			this.structure = structure;

			html+= "<colgroup>"+"<col/>".repeat(structure.length+1)+"</colgroup>\n";
			html+= "<thead><tr>\n";
			for (i in structure) {
				html+= "<th>"+structure[i].title+"</th>\n";
			}
			html+= "<th>&nbsp;</th>\n";
			html+= "</tr></thead>\n";

			html+= "<tbody>\n";
			for (i in data) {
				var columns = data[i];
				html+= '<tr id="'+this.element.attr('id')+'-row-'+i+'" data-i="'+i+'">'+"\n";
				for (k in columns) {
					html+= '<td data-value="'+columns[k]+'">';
					if (structure[k].format) {
						html+= structure[k].format(columns[k]);
					}
					else {
						html+= columns[k];
					}
					html+= "</td>\n";
				}
				html+= '<td class="editable-action-column">';
				html+= this.options.action_columns.default;
				html+= "</td>\n</tr>\n";
			}
			html+= "</tbody>\n<tfoot>\n";
			html+= '<tr class="editable-new-row-template" style="display:none">'+"\n";
			html+= '<td></td>'.repeat(structure.length);
			html+= '<td class="editable-action-column">';
			html+= this.options.action_columns.new;
			html+= "</td></tr>\n</tfoot>\n";

			this.element.html(html);
			this._addNewRow();
			this._updateLayout.call(this);
		}
	});
})(jQuery);