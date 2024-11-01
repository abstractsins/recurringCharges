const fs = require('fs');
const pdf = require('pdf-parse');

var recurring = {
    explicit: [],
    precise: [],
    verySimilar: []
}

// read each file in dir and store as one text?
const dir = '';
let dataBuffer = fs.readFileSync('C:/Users/DanielBerlin/OneDrive - Barcoding, Inc/ACTUAL STUFF/trash/eStmt_2024-05-28.pdf');

pdf(dataBuffer).then(function(data) {
    parsingFunc(data.text);
    console.dir(recurring, { depth: null, maxArrayLength: null });
});

function parsingFunc(text) {
    var lines = text.split('\n');
    lines.forEach((line, i, a) => {
        if (line.toLowerCase().match(/recurring/)) {
            if (line.toLowerCase() === 'recurring') {
                var fullEntry = [a[i-1], a[i], a[i+1]].join(' ');
                recurring.explicit.push(fullEntry);
            }
        }
    });
}

// look for word 'recurring'
// look for precise repetition of amount
// look for very similar repetition of amount
// look for repeat vendors