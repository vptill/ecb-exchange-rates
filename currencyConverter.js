const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");

module.exports = {
  settings: {
    url: "http://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
  },

  baseCurrency: "USD",

  currenciesMap: [],

  currenciesMetadata: [],

  readJson: function () {
    const data = fs.readFileSync(
      path.resolve(__dirname, "Currencies.json"),
      "utf8"
    );
    return JSON.parse(data);
  },

  removeNamespaces: function (xml) {
    const fixedXML = xml.replace(/(<\/?)(\w+:)/g, "$1");
    return fixedXML.replace(/xmlns(:\w+)?="[^"]*"/g, "").trim();
  },

  parseXML: async function (xml) {
    const cleanXML = this.removeNamespaces(xml);
    const parser = new xml2js.Parser();

    try {
      const result = await parser.parseStringPromise(cleanXML);
      const currencies = result.Envelope.Cube[0].Cube[0].Cube;
      return this.createCurrenciesMap(currencies);
    } catch (err) {
      console.error("Failed to parse XML:", err);
      throw err;
    }
  },

  createCurrenciesMap: function (currencies) {
    this.currenciesMetadata = this.readJson();
    this.currenciesMap = [];

    const baseCurrencyRate =
      this.baseCurrency !== "EUR"
        ? currencies.find((e) => e["$"].currency === this.baseCurrency)["$"]
            .rate
        : 1;

    currencies.forEach((item) => {
      const currency = item["$"].currency;
      const rate = item["$"].rate;

      const getCurrency = (currency) => {
        return this.currenciesMetadata.find((item) => item.Code === currency);
      };

      this.currenciesMap.push({
        currency,
        rate: (1 / baseCurrencyRate) * rate,
        symbol: getCurrency(currency)?.Symbol,
      });
    });

    this.currenciesMap.push({
      currency: "EUR",
      rate: (1 / baseCurrencyRate) * 1,
      symbol: "€",
    });

    return this.currenciesMap;
  },

  getExchangeRates: async function () {
    try {
      const response = await fetch(this.settings.url);
      if (response.ok) {
        const body = await response.text();
        return await this.parseXML(body);
      } else {
        return await this.parseXML(`
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
          </gesmes:Envelope>`);
      }
    } catch (err) {
      console.error("Failed to fetch exchange rates:", err);
      throw err;
    }
  },

  roundValues: function (value, places) {
    const multiplier = Math.pow(10, places);
    return Math.round(value * multiplier) / multiplier;
  },

  fetchRates: function (settings) {
    const getCurrency = (currency) => {
      return this.currenciesMap.find((item) => item.currency === currency);
    };

    const rates = {};
    rates.fromCurrency = getCurrency(settings.fromCurrency);
    rates.toCurrency = getCurrency(settings.toCurrency);
    rates.exchangeRate = (1 / rates.fromCurrency.rate) * rates.toCurrency.rate;
    return rates;
  },

  getAllCurrencies: async function () {
    const currencies = await this.getExchangeRates();
    return currencies;
  },

  getBaseCurrency: async function () {
    return { currency: this.baseCurrency };
  },

  convert: async function (settings) {
    await this.getExchangeRates();
    const exchangedValue = {};

    const rates = this.fetchRates(settings);
    exchangedValue.currency = rates.toCurrency.currency;
    exchangedValue.exchangeRate = this.roundValues(
      rates.exchangeRate,
      settings.accuracy || 4
    );
    exchangedValue.amount = this.roundValues(
      settings.amount * rates.exchangeRate,
      settings.accuracy || 4
    );

    return exchangedValue;
  },

  getExchangeRate: async function (settings) {
    await this.getExchangeRates();
    const exchangedValue = {};

    const rates = this.fetchRates(settings);
    exchangedValue.toCurrency = rates.toCurrency.currency;
    exchangedValue.fromCurrency = rates.fromCurrency.currency;
    exchangedValue.exchangeRate = this.roundValues(
      rates.exchangeRate,
      settings.accuracy || 4
    );

    return exchangedValue;
  },

  getCurrenciesMetadata: async function () {
    this.currenciesMetadata = this.readJson();
    return this.currenciesMetadata;
  },

  getCurrencyMetadata: async function (settings) {
    this.currenciesMetadata = this.readJson();
    const getCurrency = (currency) => {
      return this.currenciesMetadata.find((item) => item.Code === currency);
    };
    return getCurrency(settings.currency);
  },
};
