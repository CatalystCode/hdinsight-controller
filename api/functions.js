
var api = { console: { autoLoad: true} };

var express = require('express');
var router = api.router = express.Router();
var docRouter = require('docrouter').docRouter;
var FunctionsManager = require('../lib/manage-functions');

module.exports = api;

docRouter(router, '/api/functions', function (router) {

  router.get('/get', function(req, res) {
    
    var functionsManager = new FunctionsManager();
    functionsManager.init(function (err, appServiceClient) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      appServiceClient.get(function (err, result) {

        if (err) {
          return res.status(400).send('There was an error starting the function app:\n' + err);
        }

        console.log('Creating hdinsight...');
        var funcActive = result && result.properties && result.properties.state == 'Running' || false;
        return res.json({
          status: funcActive ? 'running' : 'stopped',
          result: result
        });
      });

    });

  },
    {
      id: 'functions_get',
      name: 'get',
      usage: 'functions get',
      example: 'functions get',
      doc: 'Getting the state of the function',
      params: { }
    });

  router.post('/start', function(req, res) {
    
    var functionsManager = new FunctionsManager();
    functionsManager.init(function (err, appServiceClient) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      appServiceClient.start(function (err, result) {

        if (err) {
          return res.status(400).send('There was an error starting the function app:\n' + err);
        }

        console.log('Creating hdinsight...');
        res.send("completed successfully");
      });

    });

  },
    {
      id: 'functions_start',
      name: 'start',
      usage: 'functions start',
      example: 'functions start',
      doc: 'starting the proxy app',
      params: { }
    });

  router.post('/stop', function(req, res) {
    
    var functionsManager = new FunctionsManager();
    functionsManager.init(function (err, appServiceClient) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      appServiceClient.stop(function (err, result) {

        if (err) {
          return res.status(400).send('There was an error stopping hdinsight manager:\n' + err);
        }

        console.log('Creating hdinsight...');
        res.send("completed successfully");
      });

    });

  },
    {
      id: 'functions_stop',
      name: 'stop',
      usage: 'functions stop',
      example: 'functions stop',
      doc: 'stopping the proxy app',
      params: { }
    });

});