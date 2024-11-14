const fs = require('fs');
const pdf = require('pdf-parse');
const { createBrotliDecompress } = require('zlib');

var recurring = {
    explicit: [],
    precise: [],
    verySimilar: []
}

var allStatements = [];

// read each file in dir and store as one text?
const dir = 'D:/Projects/recurringCharges/statements/';

fs.readdir(dir, async (err, files) => {    
    if (err) {
        console.error("Could not list the directory.", err);
        process.exit(1);
    } else {
        try {

            // Collect all file processing promises
            const filePromises = files.map(async (filename) => {
                var file = dir + filename;
                const dataBuffer = fs.readFileSync(file);
                const data = await pdf(dataBuffer);
                return data.text;
            });

            // Wait for all files to be processed
            const texts = await Promise.all(filePromises);

            var debits = texts.map(takeDebits).flat();
            var entries = debits.map(takeEntries).flat();

            entries = formatEntries(entries);
            var statement = objectifier(entries);
            allStatements.push(...statement);
            
            allStatements.sort(sortByDate);
            var statements = allStatements.slice();

            statements = pullExplicitRecurring(statements);

            console.dir(recurring, { depth: null, maxArrayLength: null });
            console.dir(statements, { depth: null, maxArrayLength: null });

        } catch (err) {
            console.error("Error processing PDF files:", err);
        }
    }    
});


function sortByDate(a, b) {
    var dateA = a.date;
    var monthA = parseInt(dateA.slice(0,2));
    var dayA = parseInt(dateA.slice(3,5));
    var yearA = parseInt(dateA.slice(-2));
  
    var dateB = b.date;
    var monthB = parseInt(dateB.slice(0,2));
    var dayB = parseInt(dateB.slice(3,5));
    var yearB = parseInt(dateB.slice(-2));

    if (dateA === dateB) {
        return 0;
    } else if (monthA === monthB) {
        if (dayA === dayB) {
            if (yearA < yearB) {
                return -1;
            }
        } else if (dayA < dayB) {
            return -1;
        } else if (dayA > dayB) {
            return 1;
        }
    } else if (monthA < monthB) {
        return -1
    } else if (monthA > monthB) {
        return 1;
    }
}

function takeDebits(string) {
    var debitPhrase = 'total deposits and other additions';
    var debitStart = string.toLowerCase().indexOf(debitPhrase);
    var debits = string.substring(debitStart);
    return debits;
}

function takeEntries(string) {
    var reg = /\x0A(\d{2}\/\d{2}\/\d{2}.+)/;
    var entries = string.split(reg);
    entries.forEach((entry, i, a) => {
        if (entry[0] === '\n') {
            a[i-1] = a[i-1] + entry;
            a[i] = '';
        }
    });
    return entries;
}

function formatEntries(string) {
    var entries = string.map(entry => {
        entry = lineRemovals(entry);
        entry = dateSeparator(entry);
        entry = gapReplacer(entry);
        entry = debitSpacer(entry);
        entry = prologueRemover(entry);
        return entry;
    });

    return entries;
}

function gapReplacer(entry) {
    entry = entry.replaceAll(/\s{4,}/g, '    '); 
    return entry;
}

function dateSeparator(entry) {
    var reg = /(\d{2}\/\d{2}\/\d{2})(\w)/;
    entry = entry.replace(reg, '$1'+' '+'$2');
    return entry;
}

function lineRemovals(entry) {
    entry = entry.replaceAll('\n', ' ');
    return entry;
}

function emptyEntryRemovals(entry) {
    if (typeof entry === 'object') {
        entry = entry.filter((el, i) => {
            if (typeof el === 'string') {
                return el.length
            }
            return entry;
        })
    };
    return entry;
}

function debitSpacer(entry) {
    var amountReg = /(\-)(\d{1,}\.\d{2})/;
    entry = entry.replace(amountReg, ' $1' + '$2');
    return entry;   
}
    
function prologueRemover(entry) {
    var amountReg = /(\-)(\d{1,}\.\d{2})/;
    var debit = entry.match(amountReg);   
    if (debit) {
        entry = entry.slice(0, debit['index']+debit[0].length+1);
    }
    return entry;
}

function objectifier(entries) {
    entries = entries.map(entry => {
        var date = entry.match(/\d{2}\/\d{2}\/\d{2}/);
        var amount = entry.match(/\-\d{1,}(,\d{3})?\.\d{2}/);
        if (date && amount) {
            var desc = entry.slice(date[0].length+1, entry.length-[amount[0].length+1]);
            // console.log([date[0], desc, amount[0]]);
            var obj = {
                date: date[0],
                desc: desc.trim(), 
                amount: amount[0]
            }
            return obj;
        } else {
            return '';
        }
    });

    entries = emptyEntryRemovals(entries);
 
    return entries;
}

function removeEntry(arr, index) {
    // arr.splice(index, 1);
    arr[index] = '';
}









function pullExplicitRecurring(statements) {
    statements.forEach((entry,i) => {
        if (entry.desc.toLowerCase().match(/recurring/)) {
            // console.log('RECURRING: ');
            // console.dir(entry);
            // console.log('\n');
            recurring.explicit.push(entry);
            removeEntry(statements, i);
        }
    });
    statements = emptyEntryRemovals(statements);
    
    return statements;
}
