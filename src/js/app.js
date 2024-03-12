import Mustache from 'mustache';

var template;

var controls = [
    { id: 'MAIN', name: 'Main', volume: 50 },
];

function render_sliders(sliders) {
    var sliderContainer = document.getElementById('SliderContainer');
    for( var i=0; i<sliders.length; i++) {
        var node = Mustache.render(template, sliders[i]);
        sliderContainer.innerHTML += node;
        console.log(sliderContainer.innerHTML)
    }
}

export function init() {
    template = document.getElementById('slider-template').innerHTML;
    render_sliders(controls);
}
