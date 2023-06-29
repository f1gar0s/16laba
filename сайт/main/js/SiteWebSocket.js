SiteWebSocket = function(psWidget, psConfig)
{
	this.sWidget = psWidget;
	if(psConfig === undefined)
	{
		this.sConfig = SiteWebSocket.getDefaultConfig();
	}
	else
	{
		this.sConfig = psConfig;
	}
};
SiteWebSocket.prototype =
{
	sWidget: null,
	
  sConfig: null,

  /**
   * Таймер переподключения к серверу.
   */
  reconnectTimer: null,

  /**
   * Интервал переподключения в секундах.
   */
  reconnectInterval: 10,

  /**
   * Ресурс интервала запроса ping.
   */
  pingInterval: null,
	
	connect: function()
	{
		var bResult = false;
		do
		{
			if(this.sConfig === false)
			{
				break;
			}
      var aConfig = SiteWebSocket.getConfigOne(this.sConfig);
			if(aConfig === false || !aConfig['enabled'])
			{
				break;
			}
			if(SiteWebSocket.oConnections[this.sConfig] !== undefined)
			{
				bResult = true;
				break;
			}
			var sAddress = aConfig['protocol'] + "://" + aConfig['host'] + ":" + aConfig['port'] + aConfig['path'];
			var poThis = this;
			SiteWebSocket.oConnections[this.sConfig] = new WebSocket(sAddress);
			SiteWebSocket.oConnections[this.sConfig].onerror = (event) => {this.errorHandler(event)};
			SiteWebSocket.oConnections[this.sConfig].onclose = (event) => {this.closeHandler(event)};
			SiteWebSocket.oConnections[this.sConfig].onopen = (event) => {this.openHandler(event)};
			SiteWebSocket.oConnections[this.sConfig].onmessage = (event) => { SiteWebSocket.messageHandler(poThis.sConfig, event);};
			bResult = true;
		}while(0);
		return bResult;
	},
	
	send: function(poMessage)
	{
		var bResult = false;
		poMessage.widget = this.sWidget;
		poMessage.service = this.sService;
		if(SiteWebSocket.oConnections[this.sConfig] !== undefined)
		{
			SiteWebSocket.oConnections[this.sConfig].send(JSON.stringify(poMessage));
			bResult = true;
		}
		return bResult;
	},
	
	/**
	 * Разорвать соединение - отключиться от сервера и очистить обработчики событий.
	 */
	close: function()
	{
		if(SiteWebSocket.oConnections[this.sConfig] !== undefined)
		{
			SiteWebSocket.oConnections[this.sConfig].close();
			delete SiteWebSocket.oConnections[this.sConfig];
			for(var sEvent in SiteWebSocket.oHandlers[this.sConfig])
			{
				if(SiteWebSocket.oHandlers[this.sConfig][sEvent][this.sWidget] !== undefined)
				{
					delete SiteWebSocket.oHandlers[this.sConfig][sEvent][this.sWidget];
				}
			}
		}
	},
	
	addEventListener: function(psEvent, poListener)
	{
		if(SiteWebSocket.oHandlers[this.sConfig] === undefined)
		{
			SiteWebSocket.oHandlers[this.sConfig] = {};
		}
		if(SiteWebSocket.oHandlers[this.sConfig][this.sWidget] === undefined)
		{
			SiteWebSocket.oHandlers[this.sConfig][this.sWidget] = {};
		}
		if(SiteWebSocket.oHandlers[this.sConfig][this.sWidget][psEvent] === undefined)
		{
			SiteWebSocket.oHandlers[this.sConfig][this.sWidget][psEvent] = [poListener];
		}
		else if(SiteWebSocket.oHandlers[this.sConfig][this.sWidget][psEvent].indexOf(poListener) === -1)
		{
			SiteWebSocket.oHandlers[this.sConfig][this.sWidget][psEvent].push(poListener);
		}
	},
	
	removeEventListener: function(psEvent, poListener)
	{
		do
		{
			if(SiteWebSocket.oHandlers[psEvent] === undefined)
			{
				break;
			}
			if(SiteWebSocket.oHandlers[psEvent][this.sWidget] === undefined)
			{
				break;
			}
			if(SiteWebSocket.oHandlers[psEvent][this.sWidget][this.sService] === undefined)
			{
				break;
			}
			var iIndex = SiteWebSocket.oHandlers[psEvent][this.sWidget][this.sService].indexOf(poListener);
			if(iIndex !== -1)
			{
				SiteWebSocket.oHandlers[psEvent][this.sWidget][this.sService].splice(iIndex, 1);
			}
		}
		while(0);
  },

  /**
   * Обработчик события подключения.
   *
   * @param {Event} event 
   */
  openHandler: function(event)
  {
    this.connected = true;
    this.ping();
  },

  /**
   * Обработчик события закрытия подключения.
   *
   * @param {Event} event 
   */
  closeHandler: function(event)
  {
    this.connected = false;
    delete SiteWebSocket.oConnections[this.sConfig];
    this.reconnect();
  },

  /**
   * Обработчик события ошибки.
   *
   * @param {Event} event 
   */
  errorHandler: function(event)
  {
    if (!SiteWebSocket.oConnections[this.sConfig]) {
      this.reconnect();
    }
  },

  /**
   * Осуществить переподключение к серверу через промежуток времени.
   */
  reconnect: function()
  {
    if (this.reconnectTimer == null) {
      this.reconnectTimer = setTimeout (
        () => {
          this.reconnectTimer = null;
          if (!SiteWebSocket.oConnections[this.sConfig]) {
            this.connect();
          }
        },
        1000 * this.reconnectInterval
      );
    }
  },

  /**
   * Подключить запрос ping раз в 10 минут.
   */
  ping: function() {
    if (!this.pingInterval) {
      this.pingInterval = setInterval(
        () => {
          if (this.connected) {
            let message = {'widget': 'pwa', 'path': 'server', 'event': 'ping', data: null};
            SiteWebSocket.oConnections[this.sConfig].send(JSON.stringify(message));
          }
        },
        10*60000
      );
    }
  }
};

/**
 * Массив настроек для подключения к серверу.
 * @type object
 */
SiteWebSocket.oConfig = {};

SiteWebSocket.sDefaultConfig = null;

SiteWebSocket.oConnections = {};

SiteWebSocket.oHandlers = {};

SiteWebSocket.setConfig = function(paConfig)
{
	SiteWebSocket.oConfig = paConfig;
};

SiteWebSocket.getConfigOne = function(psConfig)
{
	var vResult = false;
	do
	{
		var sConfig;
		if(psConfig === undefined)
		{
			sConfig = SiteWebSocket.getDefaultConfig();
		}
		else
		{
			sConfig = psConfig;
		}
		if(sConfig === false || SiteWebSocket.oConfig[sConfig] === undefined)
		{
			break;
		}
		vResult = SiteWebSocket.oConfig[sConfig];
	}
	while(0);
	return vResult;
};

SiteWebSocket.setDefaultConfig = function(psConfig)
{
	SiteWebSocket.sDefaultConfig = psConfig;
};

SiteWebSocket.getDefaultConfig = function()
{
	return SiteWebSocket.sDefaultConfig;
};

SiteWebSocket.commonHandler = function(psConfig, poEvent)
{
	do
	{
		if(SiteWebSocket.oHandlers[psConfig] === undefined)
		{
			break;
		}
		if(SiteWebSocket.oHandlers[psConfig][poEvent.type] === undefined)
		{
			break;
		}
		for(var sWidget in SiteWebSocket.oHandlers[psConfig][poEvent.type])
		{
			for(var sService in SiteWebSocket.oHandlers[psConfig][poEvent.type][sWidget])
			{
				for(var i = 0; i < SiteWebSocket.oHandlers[psConfig][poEvent.type][sWidget][sService].length; i++)
				{
					SiteWebSocket.oHandlers[psConfig][poEvent.type][sWidget][sService][i](poEvent);
				}
			}
		}
	}
	while(0);
};

SiteWebSocket.messageHandler = function(psConfig, poEvent)
{
	do
	{
    if (poEvent.type != 'message') {
      break;
    }
		if(SiteWebSocket.oHandlers[psConfig] === undefined)
		{
			break;
		}
		var oMessage = JSON.parse(poEvent.data);
		if(SiteWebSocket.oHandlers[psConfig][oMessage.widget] === undefined)
		{
			break;
		}
		if(SiteWebSocket.oHandlers[psConfig][oMessage.widget][oMessage.event] === undefined)
		{
			break;
		}
		for(var i = 0; i < SiteWebSocket.oHandlers[psConfig][oMessage.widget][oMessage.event].length; i++)
		{
			SiteWebSocket.oHandlers[psConfig][oMessage.widget][oMessage.event][i](oMessage.data);
		}
	}
	while(0);
};

window.addEventListener
(
	'beforeunload',
	function()
	{
		for(var sConnection in SiteWebSocket.oConnections)
		{
			SiteWebSocket.oConnections[sConnection].close();
			delete SiteWebSocket.oConnections[sConnection];
		}
	}
);