'use strict';
$ ( function () {
  var notifications = window.epos.notifications; // get notification for region
  delete window.epos.notifications; // clear data
  /**
   * Add button to notification
   * @param param
   * @returns {{text: *, click: click, primary: boolean}}
   */
  function addButton( param ) {
    return {
      text: param.title,
      primary: param.const == 'POSITIVE',
      click: function (notice) {
        location.href = param.link;
      }
    };
  }

  /**
   * Show notification
   * @param param
   */
  function notify( param) {
    var buttons = [];

    $.each( param.action, function (key,value) {
      if ( value !== null ) {
        if (value.title != null && value.title != '') {
          buttons.push(addButton({
            title: value.title,
            const: key,
            link: value.link,
          }));
        }
      }
    });

    PNotify.success({
      title: param.resource_name,
      text: param.resource_description,
      icon: 'fa fa-check',
      type: 'alert',
      hide: param.notification.can_hide === undefined ? true : param.notification.can_hide,
      modules: {
        Confirm: {
          confirm: true,
          buttons: buttons
        },
        Buttons: {
          closer: true,
          sticker: false
        }
      }
    });
  }

  $.each( notifications, function () {
    notify( this );
  });
});