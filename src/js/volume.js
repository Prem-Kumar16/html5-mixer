function getRootNode(node) {
    while (!node.hasAttribute('slider-id') && node.parentNode) {
        return getRootNode(node.parentNode);
    }

    if (node.hasAttribute('slider-id')) {
        return node;
    } else {
        return false;
    }
}

function getValue(node) {
    node = getRootNode(node);
    if (node) {
        return parseInt(node.getAttribute('value'));
    } else {
        return false;
    }
}

export function setValue(node, value) {
    node = getRootNode(node);
    if (node) {
        value = Math.max(Math.min(value, 100), 0);
        node.setAttribute('value', value);
        node.getElementsByTagName('progress')[0].value = value;
        node.getElementsByTagName('input')[0].value = value;
        node.getElementsByClassName('value')[0].innerHTML = value+'%';
    }
}

// TODO: right now there's only one PATHS
// if it gets update to use multiple volume controls
// all the below functions need to be update to use
// the correct paths/elements
export function increase(node) {
    KUKSA.setUInt32(PATHS.volume, getValue(node)+5);
}

export function decrease(node) {
    KUKSA.setUInt32(PATHS.volume, getValue(node)-5);
}

export function change(node) {
    KUKSA.setUInt32(PATHS.volume, node.value);
}

export function update(path, dp) {
    var value = dp.getUint32();
    setValue(document.getElementById('progress-MAIN'), value);
}

export function init() {
    KUKSA.setUInt32(PATHS.volume, 20);
}
