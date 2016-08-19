'use strict';
var log = require('./logger')().log;
var utils = require('./utils');
var path = require('path');
var fs = require('fs');
var platform = require('os').platform();
var storj = require('..');

var HOME = platform !== 'win32' ? process.env.HOME : process.env.USERPROFILE;
var DATADIR = path.join(HOME, '.storjcli');
var KEYPATH = path.join(DATADIR, 'id_ecdsa');

module.exports.getInfo =  function(client) {
  client.getInfo(function(err, info) {
     if (err) {
       return log('error', err.message);
     }

     log('info', 'Title:             %s', [info.info.title]);
     log('info', 'Description:       %s', [info.info.description]);
     log('info', 'Version:           %s', [info.info.version]);
     log('info', 'Host:              %s', [info.host]);
     info.info['x-network-seeds'].forEach(function(seed, i) {
       log('info', 'Network Seed (%s):  %s', [i, seed]);
     });
   });
};

module.exports.register = function(client) {
  utils.getCredentials(function(err, result) {
    if (err) {
      return log('error', err.message);
    }

    client.createUser({
      email: result.email,
      password: result.password
    }, function(err) {
      if (err) {
        return log('error', err.message);
      }

      log('info', 'Registered! Check your email to activate your account.');
    });
  });
};

module.exports.login = function(url) {
  if (storj.utils.existsSync(KEYPATH)) {
    return log('error', 'This device is already paired.');
  }

  utils.getCredentials(function(err, result) {
    if (err) {
      return log('error', err.message);
    }

    var client = storj.BridgeClient(url, {
      basicauth: result
    });
    var keypair = storj.KeyPair();

    client.addPublicKey(keypair.getPublicKey(), function(err) {
      if (err) {
        return log('error', err.message);
      }

      fs.writeFileSync(KEYPATH, keypair.getPrivateKey());
      log('info', 'This device has been successfully paired.');
    });
  });
};

module.exports.logout = function(client) {
  var keypair = utils.loadKeyPair();

  client.destroyPublicKey(keypair.getPublicKey(), function(err) {
    if (err) {
      log('info', 'This device has been successfully unpaired.');
      log('warn', 'Failed to revoke key, you may need to do it manually.');
      log('warn', 'Reason: ' + err.message);
      return fs.unlinkSync(KEYPATH);
    }

    fs.unlinkSync(KEYPATH);
    log('info', 'This device has been successfully unpaired.');
  });
};
