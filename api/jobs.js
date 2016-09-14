var api = { console: { autoLoad: true} };

var express = require('express');
var router = api.router = express.Router();
var docRouter = require('docrouter').docRouter;
var azure = require('azure-storage');
var config = require('../config').svc;

module.exports = api;

docRouter(router, '/api/jobs', function (router) {

  router.post('/peek', function(req, res) {
    
    var queueSvc = azure.createQueueService(config.clusterStorageAccountName, config.clusterStorageAccountKey)
        .withFilter(new azure.ExponentialRetryPolicyFilter());

    queueSvc.createQueueIfNotExists(config.inputQueueName, function(err) {
      if (err) {
        return res.status(400).send('There was an error reading the queue:\n' + err);
      }

      queueSvc.peekMessage(config.inputQueueName, function(err, result, response){
        if(err){
          return res.status(400).send('There was a problem inserting message into queue:\n' + err);
        }

        console.log('message inserted to queue successfully');
        res.json({ result: result });
      });
    });

  },
    {
      id: 'jobs_peek',
      name: 'peek',
      usage: 'jobs peek',
      example: 'jobs peek',
      doc: 'Peeking message from queue',
      params: { }
    });

  router.post('/push', function(req, res) {

    var data = req.body.data;
    if (!data) {
        return res.status(400).send('No data parameter was supplied in the request');
    }
    
    var queueSvc = azure.createQueueService(config.clusterStorageAccountName, config.clusterStorageAccountKey)
        .withFilter(new azure.ExponentialRetryPolicyFilter());

    queueSvc.createQueueIfNotExists(config.inputQueueName, function(err) {
      if (err) {
        return res.status(400).send('There was an error reading the queue:\n' + err);
      }

      queueSvc.createMessage(config.inputQueueName, data, function(err, result, response){
        if(err){
          return res.status(400).send('There was a problem inserting message into queue:\n' + err);
        }

        console.log('message inserted to queue successfully');
        res.send("message inserted to queue successfully");
      });
    });

  },
    {
      id: 'jobs_push',
      name: 'push',
      usage: 'jobs push',
      example: 'jobs push',
      doc: 'Pushing new jobs to the jobs queue',
      params: {
        "data": {
          "short": "d",
          "type": "string",
          "doc": "jobs push --data 'bla bla bla'",
          "style": "body",
          "required": false
        }
      }
    });

});