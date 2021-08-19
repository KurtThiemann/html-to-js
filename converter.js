
class AttributeConverter {
    /**
     * @param {Object} settings
     */
    constructor(settings) {
        this.settings = settings;
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    canConvertAttribute(name) {
        return true;
    }

    /**
     * @param {string} element
     * @param {string} attribute
     * @param {string} value
     * @returns {string[]}
     */
    apply(element, attribute, value) {
        return [
            `${element}.setAttribute(${JSON.stringify(attribute)}, ${JSON.stringify(value)});`
        ];
    }
}

class MappedStringPropertyAttributeConverter extends AttributeConverter {
    mappedProperties = {
        'for': 'htmlFor'
    };

    /**
     * @inheritDoc
     */
    canConvertAttribute(name) {
        return !!this.mappedProperties[name];
    }

    /**
     * @inheritDoc
     */
    apply(element, attribute, value) {
        return [
            `${element}.${this.mappedProperties[attribute]} = ${JSON.stringify(value)};`
        ];
    }
}

class StringPropertyAttributeConverter extends AttributeConverter {
    /**
     * @inheritDoc
     */
    canConvertAttribute(name) {
        const properties = [
            'name',
            'value',
            'id',
            'lang',
            'style',
            'title',
            'label',
            'type'
        ];
        return properties.includes(name);
    }

    /**
     * @inheritDoc
     */
    apply(element, attribute, value) {
        return [
            `${element}.${attribute} = ${JSON.stringify(value)};`
        ];
    }
}

class BooleanPropertyAttributeConverter extends AttributeConverter {
    /**
     * @inheritDoc
     */
    canConvertAttribute(name) {
        const properties = [
            'checked',
            'disabled',
            'selected',
            'readonly'
        ];
        return properties.includes(name);
    }

    /**
     * @inheritDoc
     */
    apply(element, attribute, value) {
        return [
            `${element}.${attribute} = true;`
        ];
    }
}

class ClassAttributeConverter extends AttributeConverter {
    /**
     * @inheritDoc
     */
    canConvertAttribute(name) {
        return name === 'class';
    }

    /**
     * @inheritDoc
     */
    apply(element, attribute, value) {
        if(!value.trim().length) {
            return [];
        }
        return [
            `${element}.classList.add(${value.split(' ').filter(n => !!n.trim().length).map(n => JSON.stringify(n)).join(', ')});`
        ];
    }
}

class ElementConverter {
    /**
     * @inheritDoc
     */
    constructor(settings) {
        this.settings = settings;

        this.attributeConverters = [
            new MappedStringPropertyAttributeConverter(this.settings),
            new StringPropertyAttributeConverter(this.settings),
            new BooleanPropertyAttributeConverter(this.settings),
            new ClassAttributeConverter(this.settings),
            new AttributeConverter(this.settings)
        ];

        this.usedNames = [];
    }

    /**
     * @param {Node} node
     * @param {string|null} appendTo
     * @param {string|null} name
     * @returns {string[]}
     */
    convert(node, appendTo = null, name = null) {
        if(!name) {
            name = this.getValidName(node);
        }
        if(node.nodeType === 3) {
            if(!node.nodeValue.length || (this.settings.ignoreWhitespaces && /^[\n\s]*$/.test(node.nodeValue))) {
                return [];
            }
            let value = this.settings.ignoreWhitespaces ? node.nodeValue.trim() : node.nodeValue;
            if(!appendTo) {
                this.usedNames.push(name);
                return [
                    `let ${name} = document.createTextNode(${JSON.stringify(value)});`
                ];
            }
            return [
                `${appendTo}.appendChild(document.createTextNode(${JSON.stringify(value)}));`
            ];
        }
        if(node.nodeType !== 1) {
            return [];
        }
        if(appendTo && !node.attributes.length && !node.childNodes.length) {
            return [
                `${appendTo}.appendChild(document.createElement(${JSON.stringify(node.nodeName.toLowerCase())}));`
            ];
        }
        this.usedNames.push(name);
        let res = [
            `let ${name} = document.createElement(${JSON.stringify(node.nodeName.toLowerCase())});`
        ];
        for(let attribute of node.attributes) {
            let converter = this.attributeConverters.find(c => c.canConvertAttribute(attribute.name));
            if(!converter) {
                continue;
            }
            res.push(...converter.apply(name, attribute.name, attribute.value));
        }
        if(appendTo) {
            res.push(`${appendTo}.appendChild(${name});`);
        }
        if(node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
            if(this.settings.ignoreWhitespaces && /^[\n\s]*$/.test(node.textContent)) {
                return res;
            }
            res.push(`${name}.textContent = ${JSON.stringify(this.settings.ignoreWhitespaces ? node.textContent.trim() : node.textContent)};`);
            return res;
        }
        for(let childNode of node.childNodes) {
            res.push(...this.convert(childNode, name));
        }
        return res;
    }

    /**
     * @param {string|null} name
     * @returns {null|string}
     */
    normalizeNodeName(name) {
        if(!name || !name.length) {
            return null;
        }
        if(!/[a-z]/.test(name)) {
            name = name.toLowerCase();
        }
        name = name.replace(/[^\w-]/g, '').replace(/[-_]./g, (match) => match.substr(1).toUpperCase());
        name = name.charAt(0).toLowerCase() + name.substr(1);
        return name.length ? name : null;
    }

    /**
     * @param {Node} node
     * @returns {string}
     */
    getValidName(node) {
        let nodeName = this.normalizeNodeName(node.name) || this.normalizeNodeName(node.id) || this.normalizeNodeName(node.nodeName);
        if(!nodeName) {
            throw new Error('Unable to find node name');
        }
        if(this.usedNames.includes(nodeName)) {
            let n, i = 1;
            do {
                n = nodeName + i;
                i++
            } while (this.usedNames.includes(n));
            nodeName = n;
        }
        return nodeName;
    }
}

