const Foo = (options) => {
    this.index = options.index;
    this.name = options.name || 'foo';
    let items = options.items;
    let self = this;
    function bar() {
    self.say()
    }
    items.forEach(function(){
    self.say()
})
    for(var i = 0; i< items.length; ++) {
    bar();
    }
    {
    Foo.prototype.say = function(){
    console.log(arguments);
    }