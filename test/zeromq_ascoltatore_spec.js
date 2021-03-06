var steed = require("steed")();

describeAscoltatore("zeromq", function() {

  var toClose = null;

  beforeEach(function() {
    toClose = [this.instance];
  });

  afterEach(function(done) {
    steed.each(toClose, function(i, cb) {
      i.close(cb);
    }, setImmediate.bind(null, done));
  });

  it("should sync two instances", function(done) {
    var instance = this.instance;
    var other = new ascoltatori.ZeromqAscoltatore(zeromqSettings());
    steed.series([

      function(cb) {
        other.on("ready", cb);
      },

      function(cb) {
        toClose.push(other);
        // we connect to the other instance control channel
        other.connect(instance._opts.controlPort, cb);
      },

      function(cb) {
        instance.subscribe("world", wrap(done), cb);
      },

      function(cb) {
        other.publish("world", null, cb);
      }
    ]);
  });

  it("should sync three instances", function(done) {
    var instance = this.instance;
    var other = new ascoltatori.ZeromqAscoltatore(zeromqSettings());
    var other2 = new ascoltatori.ZeromqAscoltatore(zeromqSettings());

    var count = 2;
    var donner = function() {
      if (--count === 0)  {
        done();
      }
    };

    steed.series([

      function(cb) {
        other.on("ready", cb);
      },

      function(cb) {
        toClose.push(other);
        other2.on("ready", cb);
      },

      function(cb) {
        toClose.push(other2);
        other.connect(instance._opts.controlPort);
        other2.connect(instance._opts.controlPort);
        setTimeout(cb, 500);
      },

      function(cb) {
        other2.subscribe("world", donner, cb);
      },

      function(cb) {
        other.subscribe("world", donner, cb);
      },

      function(cb) {
        instance.publish("world", null, cb);
      }
    ]);
  });

  it("should have one sub connection per instance", function(done) {
    var instance = this.instance;
    var other = new ascoltatori.ZeromqAscoltatore(zeromqSettings());
    var other2 = new ascoltatori.ZeromqAscoltatore(zeromqSettings());

    var count = 5;
    var donner = function(data) {
      if (--count === 0) {
        instance._control_conn.removeListener("message", donner);

        var subs = {}
        instance._sub_conns.forEach(function(c) {
          subs[c.port] = true;
        });
        expect(instance._sub_conns.length).to.equal(3);
        expect(Object.keys(subs).length).to.equal(3);

        subs = {}
        other._sub_conns.forEach(function(c) {
          subs[c.port] = true;
        });
        expect(other._sub_conns.length).to.equal(3);
        expect(Object.keys(subs).length).to.equal(3);

        subs = {}
        other2._sub_conns.forEach(function(c) {
          subs[c.port] = true;
        });
        expect(other2._sub_conns.length).to.equal(3);
        expect(Object.keys(subs).length).to.equal(3);

        done();
      }
    };

    steed.series([
      function(cb) {
        other.on("ready", cb);
      },

      function(cb) {
        toClose.push(other);
        other2.on("ready", cb);
      },

      function(cb) {
        toClose.push(other2);
        other.connect(instance._opts.controlPort);
        other2.connect(instance._opts.controlPort);
        instance.connect(other._opts.controlPort);
        instance.connect(other2._opts.controlPort);
        instance._control_conn.on("message", donner);
        cb()
      }
    ]);
  });
});
