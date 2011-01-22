__last_log = 0;

window.logreset = function(){
  __last_log = (new Date()).getTime();
}

window.log = function(){
  log.history = log.history || [];   
  log.history.push(arguments);
  if(this.console){
    // console.log( Array.prototype.slice.call(arguments) );
    var d = new Date();
    var dif = d.getTime() - __last_log;
    __last_log = d.getTime();
    console.debug(dif, Array.prototype.slice.call(arguments));
  }
};

(function(doc){
  var write = doc.write;
  doc.write = function(q){ 
    log('document.write(): ',arguments); 
    if (/docwriteregexwhitelist/.test(q)) write.apply(doc,arguments);  
  };
})(document);