(function(global) {

global.Dop = Dop;

 /**
  * @param {!Function} workerFunc worker function.
  */
function Dop(workerFunc) {
  var that = this;
  var funcString;
  var blobBuilder;
  var blobURL;

  /**
   * worker function.
   * @type {!Function}
   */
  this.func = workerFunc;

  // BlobBuilder & createObjectURL & Worker
  if (Dop.CreateBlobBuilder && Dop.CreateObjectURL && global.Worker) {
    this.support = true;

    funcString = [
      'var __selfcopy__ = self;',
      'var __workerfunc__ = ' + workerFunc.toString() + ';',
      'self = __selfcopy__;',
      'self.onmessage = function(ev) {',
      '  self.postMessage(',
      '    __workerfunc__.call(self, ev.data[0])',
      '  );',
      '};'
    ].join("\n");

    blobBuilder = Dop.CreateBlobBuilder();
    blobBuilder.append(funcString);
    blobURL = Dop.CreateObjectURL(blobBuilder.getBlob());

    this.worker = new Worker(blobURL);
    this.worker.onmessage =
      function() { that.onmessageImpl_.apply(that, arguments) };
    this.worker.onerror =
      function() { that.onerrorImpl_.apply(that, arguments) };
  } else {
    this.support = false;
  }
}

/**
 * CreateObjectURL
 */
Dop.CreateObjectURL =
  (global.URL && typeof(global.URL.createObjectURL) === 'function') ?
    function(blob) {
      return global.URL.createObjectURL(blob);
    } :
  (global.webkitURL && typeof global.webkitURL.createObjectURL === 'function') ?
    function(blob) {
      return global.webkitURL.createObjectURL(blob);
    } :
  undefined;

/**
 * BlobBuilder
 */
Dop.CreateBlobBuilder =
  (typeof(global.BlobBuilder) === 'function') ?
    function() {
      return new global.BlobBuilder();
    } :
  (typeof(global.WebKitBlobBuilder) === 'function') ?
    function() {
      return new global.WebKitBlobBuilder();
    } :
  (typeof(global.MozBlobBuilder) === 'function') ?
    function() {
      return new global.MozBlobBuilder();
    } :
  (typeof(global.MSBlobBuilder) === 'function') ?
    function() {
      return new global.MSBlobBuilder();
    } :
  undefined;

/**
 * onmessage 実装
 * Worker の onmessage をフックして、Dop の onmessage を呼ぶ.
 *
 * @param {Event} ev Event Object.
 * @private
 */
Dop.prototype.onmessageImpl_ = function(ev) {
  if (typeof(this.onmessage) === 'function') {
    this.onmessage.call(this, ev.data); // XXX: thisの各環境の状況を調べる
  }
};

/**
 * onerror 実装
 * Worker の onerror をフックして、Dop の onerror を呼ぶ.
 *
 * @param {Error} error Error Object;
 * @private
 */
Dop.prototype.onerrorImpl_ = function(error) {
  if (typeof(this.onerror) === 'function') {
    this.onerror.call(this, error); // XXX: thisの各環境の状況を調べる
  }
};

/**
 * postMessage.
 */
Dop.prototype.postMessage = function() {
  if (global.Worker && this.worker instanceof Worker) {
    this.worker.postMessage(arguments);
  } else if (typeof(this.func) === 'function') {
    this.postMessageNonWorker_(arguments);
  }
};

/**
 * Worker を使用しない postMessage 実装.
 * setTimeout ですぐに worker#onmessage を呼び、
 * その結果を onmessage に渡す.
 *
 * @param {*} args postMessage arguments.
 * @private
 */
Dop.prototype.postMessageNonWorker_ = function(args) {
  var that = this;

  setTimeout(
    function() {
      try {
        var result = that.func.apply(that, args);
        that.onmessageImpl_.call(that, {data: result});
      } catch (e) {
        that.onerrorImpl_.call(that, e);
      }
    }, 0
  );
};

})(this);

/* vim:set expandtab ts=2 sw=2: */