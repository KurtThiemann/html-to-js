const parser = new DOMParser()
window.addEventListener('load', () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');

    const rmWhitespace = document.getElementById('rm-whitespace');
    const addFragment = document.getElementById('add-fragment');

    input.addEventListener('change', updateJs);
    rmWhitespace.addEventListener('change', updateJs);
    addFragment.addEventListener('change', updateJs);

    function updateJs() {
        let doc;
        try {
            doc = parser.parseFromString(`<!DOCTYPE html><html><body>${input.value}</body></html>`, 'text/html');
        }catch (e) {
            console.error('Invalid HTML', e);
            return;
        }
        const converter = new ElementConverter({ignoreWhitespaces: rmWhitespace.checked});
        let res = [];
        let appendTo = null;
        if(addFragment.checked) {
            res.push(`let fragment = new DocumentFragment();`);
            converter.usedNames.push('fragment');
            appendTo = 'fragment';
        }
        for(let elem of doc.body.children) {
            res.push(...converter.convert(elem, appendTo));
        }
        output.value = res.join('\n');
    }
});

