Permissions = {
  removeMember: function(user_id) {
    if(!confirm("Are you sure you wish to remove this member?")) return
    if(user_id == 'anon')
      new Ajax.Request("/permissions/anon", {method:'delete'});
    else
      new Ajax.Request("/users/" + user_id + "/permissions", {method:'delete'});
  },
  
  remove: function(line) {
    if(line.getAttribute('id')) {
      if(!confirm("Are you sure you wish to remove this permission?")) return
      new Ajax.Request("/permissions/" + line.getAttribute('id').match(/(\d+)$/)[0], {method:'delete'});
    } else {
      line.remove();
    }
  },
  
  add: function(line) {
    var index   = line.parentNode.getElementsByTagName('dd').length
    var newline = line.duplicate();
    var newsel  = newline.down('select');
    var newpath = newline.down('input');
    var newid   = newline.down('input', 1);
    newline.setAttribute('id', '');
    newpath.value = '';
    newpath.setAttribute('id', 'permission_paths_' + index + '_path')
    newpath.setAttribute('name', 'permission[paths][' + index + '][path]')
    newsel.setAttribute('name', 'permission[paths][' + index + '][full_access]')
    if(newid) newid.remove();
    Event.addBehavior.unload(); Event.addBehavior.load(Event.addBehavior.rules)
  }
};

Element.addMethods({
  duplicate: function(element) {
    element = $(element);
    var clone = element.cloneNode(true);
    element.parentNode.appendChild(clone);
    return clone;
  }
});

var Sheet = Class.create();
Sheet.prototype = {
  initialize: function(element, trigger, options) {
    this.sheet = $(element);
    if(!this.sheet) return;
    this.sheetHeight = this.sheet.getHeight();
    this.trigger = $(trigger);
    this.cancelBtn = $$('img.cancelbtn')[0];
    this.overlay;
    this.build(this.sheet.id);
    this.addObservers();
  },
  
  addObservers: function() {
    this.trigger.observe('click', this.toggle.bindAsEventListener(this));
    this.cancelBtn.observe('click', this.hide.bindAsEventListener(this));
  },
  
  toggle: function() {
    if(this.overlay.visible()) {
      this.hide();
    } else {
      this.show();
    }
  },
  
  hide: function() {
    new Fx.Style(this.sheetContent, 'margin-top', {
      duration: (this.sheetHeight * 2) + 500,
      transition: Fx.Transitions.expoOut,
      onComplete: function() { this.overlay.hide(); }.bind(this)
    })._start(0, -(this.sheetHeight));
  },
  
  show: function(event) {
    this.overlay.show();
    new Fx.Style(this.sheetContent, 'margin-top', {
      duration: (this.sheetHeight * 2), 
      transition: Fx.Transitions.expoOut
    })._start(-(this.sheetHeight), 0);
  },
  
  build: function(namespace) {
    this.overlay = new Element('div', {id: namespace + '-overlay'});
    this.overlay.hide();
    this.sheetContent = new Element('div', {id: namespace + '-content'});
    this.overlay.addClassName('overlay');
    this.sheetContent.addClassName('overlay-content');
    this.sheetContent.appendChild(this.sheet);
    this.overlay.appendChild(this.sheetContent);
    $('container').appendChild(this.overlay);
  }
};

Event.addBehavior({
  'a.addpath:click': function() {
    Permissions.add(this.up());
    return false;
  },
  
  'a.delpath:click': function() {
    Permissions.remove(this.up());
  }
});