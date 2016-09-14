
var api = { console: { autoLoad: true} };

var express = require('express');
var router = api.router = express.Router();
var docRouter = require('docrouter').docRouter;
var WebJobsManager = require('../lib/manage-webjobs');

module.exports = api;

docRouter(router, '/api/webjobs', function (router) {

  router.get('/get', function(req, res) {
    
    var webjobsManager = new WebJobsManager();
    webjobsManager.init(function (err, appServiceClient) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      appServiceClient.get(function (err, result) {

        if (err) {
          return res.status(400).send('There was an error starting the function app:\n' + err);
        }

        console.log('Getting webjob...');
        var funcActive = result && result.webjob && result.webjob.status == 'Running' || false;
        return res.json({
          status: funcActive ? 'running' : 'stopped',
          result: result
        });
      });

    });

  },
    {
      id: 'webjobs_get',
      name: 'get',
      usage: 'webjobs get',
      example: 'webjobs get',
      doc: 'Getting the state of the function',
      params: { }
    });

  router.post('/start', function(req, res) {
    
    var webjobsManager = new WebJobsManager();
    webjobsManager.init(function (err, appServiceClient) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      appServiceClient.start(function (err, result) {

        if (err) {
          return res.status(400).send('There was an error starting the function app:\n' + err);
        }

        console.log('Starting webjob...');
        res.send("completed successfully");
      });

    });

  },
    {
      id: 'webjobs_start',
      name: 'start',
      usage: 'webjobs start',
      example: 'webjobs start',
      doc: 'starting the proxy app',
      params: { }
    });

  router.post('/stop', function(req, res) {
    
    var webjobsManager = new WebJobsManager();
    webjobsManager.init(function (err, appServiceClient) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      appServiceClient.stop(function (err, result) {

        if (err) {
          return res.status(400).send('There was an error stopping hdinsight manager:\n' + err);
        }

        console.log('Stopping webjob...');
        res.send("completed successfully");
      });

    });

  },
    {
      id: 'webjobs_stop',
      name: 'stop',
      usage: 'webjobs stop',
      example: 'webjobs stop',
      doc: 'stopping the proxy app',
      params: { }
    });

});