var xml2js = require('xml2js');
var request = require('request');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

module.exports = {

    settings: {
      url: "http://www.ecb.int/stats/eurofxref/eurofxref-daily.xml"
    },

    baseCurrency: "USD",

    currenciesMap: [],

    currenciesMetadata: [],

    executeCallback: null,

    readJson: function() {
      var data = fs.readFileSync(path.resolve(__dirname, 'Currencies.json'), 'utf8');
      return JSON.parse(data);
    },

    removeNamespaces: function(xml){
      var fixedXML = xml.replace(/(<\/?)(\w+:)/g,'$1');
      return (fixedXML.replace(/xmlns(:\w+)?="[^"]*"/g,'')).trim();
    },

    parseXML: function(xml) {
      var self = this;
      var cleanXML = this.removeNamespaces(xml);
      var parser = new xml2js.Parser();

      parser.parseString(cleanXML, function(err,result){
        var currencies = result.Envelope.Cube[0].Cube[0].Cube;
        self.createCurrenciesMap(currencies);
      });

    },

    createCurrenciesMap: function(currencies) {
      this.currenciesMap = []
      var self = this;
      let baseCurrencyRate = this.baseCurrency !== 'EUR' ? currencies.find(e => e['$'].currency === this.baseCurrency)['$'].rate : 1;
      _.each(currencies, function(item) {
         var currency = eval('item.$').currency;
         var rate = eval('item.$').rate;
         self.currenciesMap.push({ currency: currency, rate: (1 / baseCurrencyRate) * rate });
      });
      self.currenciesMap.push({ currency: 'EUR', rate: (1 / baseCurrencyRate) * 1 });
      self.executeCallback();
    },

    getExchangeRates: function() {
      var self = this;
      request(self.settings.url, function(error, response, body) {

        if (!error && response.statusCode == 200) {
          self.parseXML(body);
        } else {
          self.parseXML(`
          <gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
            <gesmes:subject>Reference rates</gesmes:subject>
            <gesmes:Sender>
            <gesmes:name>European Central Bank</gesmes:name>
            </gesmes:Sender>
            <Cube>
            <Cube time="2023-04-20">
            <Cube currency="USD" rate="1.0944"/>
            <Cube currency="JPY" rate="147.46"/>
            <Cube currency="BGN" rate="1.9558"/>
            <Cube currency="CZK" rate="23.502"/>
            <Cube currency="DKK" rate="7.4524"/>
            <Cube currency="GBP" rate="0.88153"/>
            <Cube currency="HUF" rate="377.68"/>
            <Cube currency="PLN" rate="4.6110"/>
            <Cube currency="RON" rate="4.9308"/>
            <Cube currency="SEK" rate="11.3280"/>
            <Cube currency="CHF" rate="0.9810"/>
            <Cube currency="ISK" rate="149.50"/>
            <Cube currency="NOK" rate="11.6040"/>
            <Cube currency="TRY" rate="21.2348"/>
            <Cube currency="AUD" rate="1.6290"/>
            <Cube currency="BRL" rate="5.5484"/>
            <Cube currency="CAD" rate="1.4757"/>
            <Cube currency="CNY" rate="7.5298"/>
            <Cube currency="HKD" rate="8.5907"/>
            <Cube currency="IDR" rate="16364.81"/>
            <Cube currency="ILS" rate="4.0022"/>
            <Cube currency="INR" rate="89.9365"/>
            <Cube currency="KRW" rate="1450.34"/>
            <Cube currency="MXN" rate="19.8156"/>
            <Cube currency="MYR" rate="4.8564"/>
            <Cube currency="NZD" rate="1.7763"/>
            <Cube currency="PHP" rate="61.429"/>
            <Cube currency="SGD" rate="1.4599"/>
            <Cube currency="THB" rate="37.609"/>
            <Cube currency="ZAR" rate="19.8552"/>
            </Cube>
            </Cube>
          </gesmes:Envelope>`
          )
        }

      });
    },

    roundValues: function (value, places) {
        var multiplier = Math.pow(10, places);
        return (Math.round(value * multiplier) / multiplier);
    },

    fetchRates: function(settings) {
      var self = this;
      var getCurrency = function(currency) {
        return _.find(self.currenciesMap, function(item) {
           return item.currency === currency
        });
      };

      var rates = {};
      rates.fromCurrency = getCurrency(settings.fromCurrency);
      rates.toCurrency = getCurrency(settings.toCurrency);
      rates.exchangeRate = (1 / rates.fromCurrency.rate) * rates.toCurrency.rate;
      return rates;
    },

    getAllCurrencies: function(callback) {
      this.getExchangeRates();
      this.executeCallback = function() {
          callback(this.currenciesMap);
        };
    },

    getBaseCurrency: function(callback) {
      this.executeCallback = function() {
          callback({currency:this.baseCurrency});
        }();
    },

    convert: function(settings, callback) {
      this.getExchangeRates();
      this.executeCallback = function() {
          var exchangedValue = {};

          var rates = this.fetchRates(settings);
          exchangedValue.currency = rates.toCurrency.currency;
          exchangedValue.exchangeRate = this.roundValues(rates.exchangeRate, settings.accuracy | 4);
          exchangedValue.amount = this.roundValues(settings.amount * rates.exchangeRate, settings.accuracy | 4);

          callback(exchangedValue);
        };
    },

    getExchangeRate: function(settings, callback) {
      this.getExchangeRates();
      this.executeCallback = function() {
          var exchangedValue = {};

          var rates = this.fetchRates(settings);
          exchangedValue.toCurrency = rates.toCurrency.currency;
          exchangedValue.fromCurrency = rates.fromCurrency.currency;
          exchangedValue.exchangeRate = this.roundValues(rates.exchangeRate, settings.accuracy | 4);

          callback(exchangedValue);
        };
    },

    getCurrenciesMetadata: function(callback) {
      this.currenciesMetadata = this.readJson();
      callback(this.currenciesMetadata);
    },

    getCurrencyMetadata: function(settings, callback) {
      this.currenciesMetadata = this.readJson();

      var self = this;
      var getCurrency = function(currency) {
        return _.find(self.currenciesMetadata, function(item) {
           return item.Code === currency
        });
      };

      callback(getCurrency(settings.currency));
    }

};
