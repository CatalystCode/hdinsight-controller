var util = require('util');
var async = require('async');

var Queue = require('./azure-queue');
var JobProxy = require('./job-proxy');
var config = require('../config');

/*
 * A class to define a web job runner which manages the following elements:
 * 1 - service module to run
 * 2 - queue in: the queue to listen to and receive messages from
 * 3 - queue out: the queue to push new messages to
 * 4 - stop\start service
 */
function Runner(options) {

  var processMessage = null;
  var queueIn = null;
  var queueOut = null;
  var shouldStop = false;
  options = options || {};
  
  // Initialize Service
  var svc = new JobProxy();

  // Check module interface
  if (!svc.queueInName && !options.queueIn) throw new Error('queueInName was not provided');
  if (typeof svc.processMessage !== 'function') throw new Error('processMessage funtion was not provided');

  return {
    queueIn: queueIn,
    queueOut: queueOut,
    start: start,
    stop: stop
  };

  /*
   * Initialize queue in\out
   */
  function initQueues (cb) {
    
    async.parallel([
      
      // Initialize in queue
      function (cb) {
        
        if (options.queueIn) {
          queueIn = options.queueIn;
          
        } else {
          
          console.log('initializing queue: ', svc.queueInName);
          queueIn = new Queue(svc.queueInName, config);
        }
        
        queueIn.init(function (err) {
          if (err) return cb(err);
          console.log('queue %s initialized...', svc.queueInName);
          return cb();
        });
      },
      
      // Initialize out queue
      function (cb) {
        
        if (options.queueOut) {
          queueOut = options.queueOut;
          
        } else {
        
          if (!svc.queueOutName) return cb();
          console.log('initializing queue: ', svc.queueOutName);
          queueOut = new Queue(svc.queueOutName, config);
        }
        
        queueOut.init(function (err) {
          if (err) return cb(err);
          console.log('queue %s initialized...', svc.queueOutName);
          return cb();
        });
      }
    ], 
    
    // set service queues and start querying for messages
    function(err) {
      if (err) {
        console.error('error initializing queues', err);
        return cb(err);
      }

      svc.initializeQueues(queueIn, queueOut);
        return cb();
      }
    );
  }
  
  /*
  * start the worker processing flow
  */
  function start(cb) {

    // Validity Check
    if (!cb || typeof cb !== 'function') return cb(new Error('callback function was not provided'));
  
    initQueues(function (err) {
     
     if (err) return cb(err);
     
     checkInputQueue();
     return cb();
   });
  }
  
  /*
   * Check in queue for new messages and process them accordingly
   */
  function checkInputQueue() {
    
    if (shouldStop) {
      shouldStop = false;
      return;
    }
    
    console.log('checking queue:', svc.queueInName);
    queueIn.getSingleMessage(function (err, message) {
      if (err) {
        console.error('error getting message from queue', err);
        return setNextCheck();
      }

      // if we don't have a message, wait a bit and check later
      if (!message) {
        return setNextCheck();
      }
      
      // try to parse message json
      var msgObject;
      try {
        msgObject = JSON.parse(message.messageText);
      }
      catch (err) {
        console.error('error parsing message, invalid json, deleting...', message);
        return deleteMessage(message, function (err) { 
          console.error('error deleting message', message);
        });
      }
      
      ensureMessageLogging(msgObject, message.messageId);

      // run service specific processMessage handler
      // pass the message object
      return svc.processMessage(msgObject, function (err) {
        if (err) {
          msgObject.error('error processing message:', message.messageId, err);
          
          // move to the next message immediately without waiting
          return checkInputQueue();
        } else {
          // message processed successfully- delete and move on the next one
          msgObject.log('deleting item');
          return deleteMessage(message, function(err) {
            if (err) msgObject.error('error deleting message:', message.messageId, err);
            
            // move to the next message immediately without waiting
            return checkInputQueue();
          });
        }
      });
    });
  }
  
  function ensureMessageLogging(parsedMessageObj, messageid) {
  
    if (!parsedMessageObj || parsedMessageObj.info) return;
    
    // this is a temporary solution to add message id to the logs
    // explore this approach for long term:
    // https://datahero.com/blog/2014/05/22/node-js-preserving-data-across-async-callbacks/
    ['log', 'info', 'warn', 'error'].forEach(function(level) {
      parsedMessageObj[level] = function() {
        msg = util.format.apply(null, arguments);
        msg = '[' + messageid + '] ' + msg;
        console[level].call(null, msg);
      }
    });

    parsedMessageObj.log('new message id:', messageid);      
  }
  
  /*
   * Set the next queue check with time out
   */
  function setNextCheck() {
    console.log('Next check of %s is in %d milliseconds', svc.queueInName, config.queue.checkFrequencyMsecs);
    setTimeout(checkInputQueue, config.queue.checkFrequencyMsecs);
  };

  /*
   * Delete a message from the in queue
   */
  function deleteMessage(message, cb) {
    return queueIn.deleteMessage(message, function (err) {
      if (err) return cb(new Error('error deleting item from queue', err));
      return cb();
    });
  }
  
  /*
   * Indicate the current service to stop.
   * The service will not stop immediately but on the next iteration.
   */
  function stop() { 
    shouldStop = true; 
  }
}

module.exports = Runner;