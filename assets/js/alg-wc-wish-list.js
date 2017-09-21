/**
 * @summary Main JS of Wish list for WooCommerce plugin.
 *
 * This js is mainly responsible for adding / removing WooCommerce product items from Wish list through Ajax,
 * and to show a notification to user when Ajax response is complete.
 *
 * @version   1.3.0
 * @since     1.0.0
 * @requires  jQuery.js
 */

alg_wc_wl_get_toggle_wishlist_item_data = function(clicked_btn) {
	data = {
		action           : alg_wc_wl_ajax.action_toggle_item,
		unlogged_user_id : alg_wc_wish_list.get_cookie('alg-wc-wl-user-id'),
		alg_wc_wl_item_id: clicked_btn.attr('data-item_id')
	};
	return data;
}

var alg_wc_wish_list = {};
jQuery(function ($) {
	alg_wc_wish_list = {

		/**
		 * Initiate
		 */
		init: function () {
			$(document.body).on('click', alg_wc_wl_toggle_btn.btn_class, this.toggle_wishlist_item);
			this.handle_item_removal_from_wishlist_page();
			this.setup_izitoast();
		},

		/**
		 * Get cookie
		 * @param cname
		 * @returns {*}
		 */
		get_cookie:function(cname){
			var name = cname + "=";
			var decodedCookie = decodeURIComponent(document.cookie);
			var ca = decodedCookie.split(';');
			for(var i = 0; i <ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == ' ') {
					c = c.substring(1);
				}
				if (c.indexOf(name) == 0) {
					return c.substring(name.length, c.length);
				}
			}
			return "";
		},

		/**
		 * Handle Item removal from wish list page.
		 *
		 * Here the item is removed from DOM only.
		 * The real thing happens through ajax on function toggle_wishlist_item()
		 */
		handle_item_removal_from_wishlist_page: function () {
			$("body").on('alg_wc_wl_toggle_wl_item', function (e) {
				if (e.response.success) {
					if (jQuery('.alg-wc-wl-view-table').length) {
						e.target.parents('tr').remove();
					}
					if (jQuery('.alg-wc-wl-view-table tbody tr').length == 0) {
						jQuery('.alg-wc-wl-view-table').remove();
						jQuery('.alg-wc-wl-empty-wishlist').show();
						$('.alg-wc-wl-social').remove();
					}
				}
			});
		},

		/**
		 * Convert a string to Boolean.
		 *
		 * It handles 'True' and 'False' Strings written as Lowercase or Uppercase.
		 * It also detects '0' and '1' Strings
		 */
		convertToBoolean: function (variable) {
			if(typeof variable === 'string' || variable instanceof String){
				variable = variable.toLowerCase();
			}
			return Boolean(variable == true | variable === 'true');
		},

		/**
		 * Toggle wish list item.
		 * If it is already in wish list, it is removed or else it is added
		 */
		toggle_wishlist_item: function () {
			var btns_with_same_item_id = jQuery(alg_wc_wl_toggle_btn.btn_class + '[data-item_id="' + jQuery(this).attr('data-item_id') + '"]');
			var this_btn = jQuery(this);
			var data = alg_wc_wl_get_toggle_wishlist_item_data(this_btn);			

			if (!this_btn.hasClass('loading')) {
				this_btn.addClass('loading');
				jQuery.post(alg_wc_wl.ajaxurl, data, function (response) {
					if (response.success) {
						if (btns_with_same_item_id.hasClass('remove')) {
							btns_with_same_item_id.removeClass('remove');
							btns_with_same_item_id.addClass('add');
						} else {
							btns_with_same_item_id.removeClass('add');
							btns_with_same_item_id.addClass('remove');
						}
					}
					$("body").trigger({
						type    : "alg_wc_wl_toggle_wl_item",
						item_id : this_btn.attr('data-item_id'),
						target  : this_btn,
						response: response
					});

					var can_show_notification = false;
					if (alg_wc_wish_list.convertToBoolean(alg_wc_wish_list.get_notification_option('mobile')) && alg_wc_wish_list.is_mobile()) {
						can_show_notification = true;
					} else if (alg_wc_wish_list.convertToBoolean(alg_wc_wish_list.get_notification_option('desktop')) && !alg_wc_wish_list.is_mobile()) {
						can_show_notification = true;
					}

					if (can_show_notification) {
						alg_wc_wish_list.show_notification(response);
					}

					this_btn.removeClass('loading');
				});
			}
		},

		/**
		 * Detect if user is browsing with a mobile
		 * @returns {boolean}
		 */
		is_mobile:function(){
			if(window.innerWidth <= 800 || window.innerHeight <= 600) {
				return true;
			} else {
				return false;
			}
		},

		/**
		 * Get notification options dynamically through the object called 'alg_wc_wl_notification'
		 *
		 * @param option
		 * @param default_opt
		 * @returns {*}
		 */
		get_notification_option: function (option, default_opt) {
			var result = null;
			if (typeof default_opt !== "undefined") {
				result = default_opt;
			}
			if (typeof alg_wc_wl_notification !== 'undefined') {
				if (alg_wc_wl_notification.hasOwnProperty(option) && !$.isEmptyObject(alg_wc_wl_notification[option])) {
					result = alg_wc_wl_notification[option];
				}
			}
			return result;
		},

		/**
		 * Get notification icon
		 *
		 * @param response
		 * @returns {string}
		 */
		get_notification_icon: function (response) {
			var icon = 'fa fa-heart';
			switch (response.data.action) {
				case 'added':
					icon = alg_wc_wish_list.get_notification_option('icon_add', 'fa fa-heart');
					break;
				case 'removed':
					icon = alg_wc_wish_list.get_notification_option('icon_remove', 'fa fa-heart-o');
					break;
				case 'error':
					icon = alg_wc_wish_list.get_notification_option('icon_error', 'fa fa-exclamation-circle');
					break;
				default:
					if (response.data.icon !== 'undefined') {
						icon = response.data.icon;
					}
			}
			return icon;
		},

		/**
		 * Show notification
		 *
		 * @param response
		 */
		show_notification: function (response) {
			iziToast.destroy();
			iziToast.show({
				message : response.data.message,
				icon    : alg_wc_wish_list.get_notification_icon(response)
			});
		},

		/**
		 * Setups Izitoast with default options
		 */
		setup_izitoast:function(){
			this.setup_notification_to_close_on_esc();
			var settings = {
				resetOnHover    :true,
				drag            :false,
				layout          : 2,
				color           : 'dark',
				timeout         : alg_wc_wish_list.get_notification_option('timeout', 0),
				backgroundColor : '#000000',
				progressBar     : alg_wc_wish_list.convertToBoolean(alg_wc_wish_list.get_notification_option('progressBar', true)),
				position        : alg_wc_wish_list.get_notification_option('position', 'center'), // bottomRight, bottomLeft, topRight, topLeft, topCenter, bottomCenter
				progressBarColor: 'rgb(255, 255, 255)',
				class           : 'alg-wc-wl-izitoast',
				onClose: function(instance, toast, closedBy){
					$("body").trigger({
						type    : "alg_wc_wl_notification_close",
						message : jQuery(toast).find('p.slideIn'),
					});
				}
			};

			// Handle ok button to close notification
			if(alg_wc_wish_list.convertToBoolean(alg_wc_wish_list.get_notification_option('ok_button', false))){
				settings.buttons = [
					['<button>OK</button>', function (instance, toast) {
						instance.hide({}, toast);
					}]
				];
			}

			iziToast.settings(settings);
		},

		/**
		 * Setups izitoast to close on esc
		 */
		setup_notification_to_close_on_esc:function(){
			$(document).keyup(function(e) {
				if (e.keyCode == 27) {
					if (jQuery('.iziToast').length>0) {
						iziToast.hide({}, '.iziToast');
					}
				}
			});
		}
	}
	alg_wc_wish_list.init();
});
/**
 * Manages social options
 */
jQuery(function ($) {
	var alg_wc_wl_social = {

		/**
		 * Initializes
		 */
		init: function () {
			this.email_options_toggler('.alg-wc-wl-social-li .email', '.alg-wc-wl-email-options');
			this.handle_send_to_option();
		},

		email_options_toggler: function (selector, options_elem_selector) {
			var is_active = -1;
			$('body').on('click',selector,function(e){
				var trigger = $(this);
				e.preventDefault();
				is_active*=-1;
				if(is_active==1){
					trigger.addClass('active');
				}else{
					trigger.removeClass('active');
				}

				$(options_elem_selector).slideToggle();
			})
		},

		handle_send_to_option: function () {
			$('body').on('change', 'input[name="alg_wc_wl_email_send_to"]', function (e) {
				var selected_val = $(this).val();
				if (selected_val == 'friends') {
					$('.alg-wc-wl-emails-input').show();
				} else if (selected_val == 'admin') {
					$('.alg-wc-wl-emails-input').hide();
				}
			});
		}

	}
	alg_wc_wl_social.init();
})
/**
 * Controls thumb button position
 */
jQuery(function ($) {
	var alg_wc_wl_thumb_btn_positioner = {

		thumb_btn: null,
		offset: 0,
		offset_single: 0,
		offset_loop: 0,
		thumb_btn_position: 'topRight',
		buttons_count: 0,
		repeater: null,

		/**
		 * Initiate
		 */
		init: function () {
			this.thumb_btn = jQuery('.' + this.get_thumb_option('thumb_css_class', 'alg-wc-wl-thumb-btn'));
			this.thumb_btn_position = this.get_thumb_option('position', 'topLeft');
			this.offset = parseInt(this.get_thumb_option('offset_loop', 17));
			this.offset_single = parseInt(this.get_thumb_option('offset_single', 17));
			this.offset_loop = parseInt(this.get_thumb_option('offset_loop', 17));
			this.thumb_btn.css('left', 'auto').css('top', 'auto').css('right', 'auto').css('bottom', 'auto');
			this.position_btns_looping();
			window.onresize = function(event) {
				clearInterval(alg_wc_wl_thumb_btn_positioner.repeater);
				alg_wc_wl_thumb_btn_positioner.position_btns_looping();
			};
		},

		/**
		 * Initiate a repeater to positioning buttons
		 *
		 * It has to be a set interval because we need to wait images loaded to calculate its offset and position.
		 * But don't need to worry because we are always checking when it is complete with stopRepeater()
		 */
		position_btns_looping: function () {
			this.repeater = setInterval(function () {
				alg_wc_wl_thumb_btn_positioner.position_btns()
			}, 200);
		},

		/**
		 * Position thumb buttons where they belong (bottomRight, bottomLeft, topRight, topLeft for now)
		 */
		position_btns: function () {
			alg_wc_wl_thumb_btn_positioner.thumb_btn.each(function () {
				var offset = alg_wc_wl_thumb_btn_positioner.offset;
				var offset_single = alg_wc_wl_thumb_btn_positioner.offset_single;
				var offset_loop = alg_wc_wl_thumb_btn_positioner.offset_loop;
				var single = false;

				if (jQuery(this).closest('[class*="products"]').length) {
					offset = offset_loop;
					single = false;
				} else {
					offset = offset_single;
					single = true;
				}

				var img = jQuery(this).parent().find('img');
				if (img.offset() && img.parent().offset) {
					var positionBottom = img.height() - jQuery(this).height() - offset;
					var positionTop = offset;
					var positionLeft = offset + img.offset().left - img.parent().offset().left;
					var positionRight = offset + img.offset().left - img.parent().offset().left;
					if (alg_wc_wl_thumb_btn_positioner.thumb_btn_position.match(/bottom/i)) {
						jQuery(this).css('top', positionBottom);
					}
					if (alg_wc_wl_thumb_btn_positioner.thumb_btn_position.match(/top/i)) {
						jQuery(this).css('top', positionTop);
					}
					if (alg_wc_wl_thumb_btn_positioner.thumb_btn_position.match(/right/i)) {
						jQuery(this).css('right', positionRight);
					}
					if (alg_wc_wl_thumb_btn_positioner.thumb_btn_position.match(/left/i)) {
						jQuery(this).css('left', positionLeft);
					}

					if(single){
						if(!jQuery(this).hasClass('positioned-on-parent')){
							var product_gallery = jQuery(this).parent().parent();
							product_gallery.append(jQuery(this));
							jQuery(this).addClass('positioned-on-parent');
						}
					}
					jQuery(this).show();
					alg_wc_wl_thumb_btn_positioner.buttons_count++;
					alg_wc_wl_thumb_btn_positioner.stopRepeater();
				}

			});
		},

		/**
		 * Knows when function "position_btns()" has to stop
		 */
		stopRepeater: function () {
			if (alg_wc_wl_thumb_btn_positioner.buttons_count == alg_wc_wl_thumb_btn_positioner.thumb_btn.length) {
				clearInterval(alg_wc_wl_thumb_btn_positioner.repeater);
				alg_wc_wl_thumb_btn_positioner.buttons_count=0;
			}
		},

		/**
		 * Get thumb options dynamically through the object called 'alg_wc_wl_thumb'
		 *
		 * @param option
		 * @param default_opt
		 * @returns {*}
		 */
		get_thumb_option: function (option, default_opt) {
			var result = null;
			if (typeof default_opt !== "undefined") {
				result = default_opt;
			}
			if (typeof alg_wc_wl_thumb !== 'undefined') {
				if (alg_wc_wl_thumb.hasOwnProperty(option) && !$.isEmptyObject(alg_wc_wl_thumb[option])) {
					result = alg_wc_wl_thumb[option];
				}
			}
			return result;
		}
	}

	alg_wc_wl_thumb_btn_positioner.init();
});
/**
 * Updates wish list counter
 */

var alg_wc_wl_counter = {};
jQuery(function ($) {
	alg_wc_wl_counter = {
		counter_selector: '.alg-wc-wl-counter',

		init: function () {
			if ($(this.counter_selector).length) {
				$("body").on('alg_wc_wl_toggle_wl_item', function (e) {
					alg_wc_wl_counter.update_counter();
				});
			}
		},

		update_counter: function () {
			$.post(alg_wc_wl.ajaxurl, {
				action: alg_wc_wl_get_wl_ajax_action,
				ignore_excluded_items: true
			}, function (response) {
				if (response.success) {
					var wishlist = response.data.wishlist;
					$(alg_wc_wl_counter.counter_selector).html(wishlist.length);
				}
			});
		}
	}
	alg_wc_wl_counter.init();
});