var dialog = dialog || {};

/**
 * Вывод оповещений о новых сообщениях в диалогах.
 */
dialog.Notification = class
{
  /**
   * Конструктор
   * @param {string} dialogHref ссылка на страницу диалога, к которой будет добавляться в конец идентификатор диалога
   */
  constructor(dialogHref)
  {
    this.dialogHref = dialogHref;
    this.sw = false;
    //ждём одну секунду, чтобы скрипт успел проверить наличие push подписки
    setTimeout(() => {
      if (!this.sw) {
        this.connectWebSocket()
      }
    }, 1000);
    this.checkServiceWorker();
  }

  /**
   * Проверить (асинхронно) наличие push подписки у пользователя.
   */
  checkServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then( (swRegistration) => {
        swRegistration.pushManager.getSubscription().then( pushSubscription => {
          if(pushSubscription) {
            this.sw = true;
            if (this.ws) {
              this.ws.close();
            }
          }
        });
      });
    }
  }

  /**
   * Подключиться к web socket.
   */
  connectWebSocket() {
    this.ws = new SiteWebSocket('dialog');
    this.ws.connect();
    this.ws.addEventListener('new_message', message => {
      if (!message.mine) {
        let messageTitle = '<div class="d-flex justify-content-between align-items-start"><span>' + message.ownerLastname;
        if (message.ownerFirstname) {
          messageTitle += ' ' + message.ownerFirstname[0] + '.';
          if (message.ownerPatronymic) {
            messageTitle += message.ownerPatronymic[0] + '.';
          }
        }
        messageTitle += '</span>';
        messageTitle += '<a href="' + this.dialogHref + message.parentId + '" class="d-inline-flex" title="к диалогу"><small><i class="fas fa-share"></i></small></a>';
        messageTitle += '</div>';
        PNotify.info({
          title: messageTitle,
          titleTrusted: true,
          text: message.message,
          delay: 10000,
          modules: {
            Buttons: {
              closer: true,
              closerHover: false,
              sticker: false
            }
          }
        });
      }
      //дополнительная проверка наличия push подписки - она могла появиться в процессе работы
      this.checkServiceWorker();
    });
  }
}