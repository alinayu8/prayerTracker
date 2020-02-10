// TODO: Rewrite loading and reloading
// TODO: Refactor everything...
$(document).ready(function() {
    setUp();
    eventHandlers();
});

$( window ).unload(function() {
    $('.selected').removeClass('selected')
    saveDates();
    saveContent();
    // chrome.storage.local.clear();
    // chrome.storage.sync.clear()
});

function setUp() {
    reloadData();
}

function eventHandlers() {
    savePerson();
    saveEditedPerson();
}

function reloadData() {
    chrome.storage.local.get(['containerWeek'], function(result) {
        $('.container.week').html(result['containerWeek'])
        setPersonOnDay(); // After all the data is reloaded, pfft
        daysOfWeek(); // Override the data with new days of the week
        resetDays(); // After the data is reloaded and reset lol
        configureRandom(); // Get new card
        configureDropdown();
    }); 
}

function daysOfWeek() {
    // Assign which day of the week it is
    var date = new Date();
    var today = date.getDay();
    days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    $(".day.1").text(days[(today + 1)%7])
    $(".day.2").text(days[(today + 2)%7])
    $(".day.3").text(days[(today + 3)%7])
    $(".day.4").text(days[(today + 4)%7])
    $(".day.5").text(days[(today + 5)%7])
    $(".day.6").text(days[(today + 6)%7])
    $(".day.7").text(days[today%7])
};

function resetDays() {
    chrome.storage.local.get(['mostRecentWeek'], function(result) {
        if (result['mostRecentWeek'] != undefined) {
            var currentWeek = getCurrentWeek();
            var mostRecentWeek = result['mostRecentWeek'];
            // var mostRecentWeek = ["02/02/2020", "02/03/2020", "02/04/2020", "02/05/2020", "02/06/2020", "02/07/2020", "02/08/2020"]
            var resetWeek = new Array(7).fill(-1);
            console.log(mostRecentWeek);
            console.log(currentWeek);
            for (i = 0; i < 7; i++) { // Example of final array could be [1, 2, 3, 4, 5, 6, -1]
                var index = currentWeek.indexOf(mostRecentWeek[i]);
                if (index > -1) {
                    resetWeek[index] = i;
                }
            } 
            console.log(resetWeek)
            for (i = 0; i < 7; i++) {
                for (j = 1; j < 11; j++) {
                    var row = '.row.' + j;
                    var newCol = '.content.' + parseInt(i + 1) // where the content needs to be
                    if (resetWeek[i] > -1) { // OVERWRITE
                        var oldCol = '.content.' + parseInt(resetWeek[i] + 1) // where the content was last time
                        var currentContent = $(row).find(oldCol).html(); // what the content is
                        $(row).find(newCol).html(currentContent); // where to overwrite content
                    } else { // WIPE FOR A NEW DAY
                        $(row).find(newCol).html('&nbsp'); // where to overwrite content
                    }
                }
            }
        }
    }); 
}

function configureDropdown() {
    // Select dropdowns on the calendar
    chrome.storage.sync.get(null, function(result) {
        var takenCols = new Array(7).fill(-1);
        for (i = 0; i < 9; i++) { // going bottom up
            var currentRow = 9 - i;
            let row = '.row.' + currentRow;
            if ($(row).find(".static").html() != undefined) { // Try to insert dropdown below some cells
                $(row).find(".static").each(function() { // Going through each static cell
                    let colClasses = $(this).parent().attr('class'); // All the classes of this cell
                    let currentCol = parseInt(colClasses.charAt(colClasses.length - 1)); // Which column is it in?
                    if (takenCols[currentCol - 1] == -1) { // Is it available to populate?
                        takenCols[currentCol - 1] = currentCol; // Mark it off as unable to be populated
                        insertNewDropdown(currentCol, currentRow);
                    }
                });
            }
        }
        // If col is completely empty
        for (i = 0; i < 7; i++) {
            if (takenCols[i] == -1) {
                var options = getOptions(result);
                var dropdown = `
                <select name="selValue" class="selectpicker form-control">
                    <option>None</option>`

                var dropdown_end= `</select>
                </div> `

                var content = dropdown + options + dropdown_end
                $('.row.1').find('.content.' + (i + 1)).html(content);
            }
        }
    });
};

function configureRandom() {
    // Get ALL the names
    chrome.storage.sync.get(null, function(result) {
        var allKeys = Object.entries(result);
        var names = [];
        for (let [key, value] of allKeys) {
            names.push(key);
        }
        // Get the CURRENT names
        $(".form-control-plaintext").each(function() {
            let name = $(this).attr('value');
            if (names.includes(name)) {
                names.splice(names.indexOf(name), 1);
            }
        });

        // Randomize
        let high = names.length - 1;
        let low = 0;
        let index = Math.floor(Math.random() * (1 + high - low)) + low;
        let name = names[index];
        let value = result[name];
        $('.random').find('.name').html(name)
        $('.random').find('.requests').html(value)
    });
};

function setPersonOnDay() {
    // Change dropdown value
    $('.content').on("change", function(e) {
        console.log("Value has changed");
        var name = $(this).find(".selectpicker").val();
        if (name == 'None') { // Choose None
            $(this).html('&nbsp;');
            console.log($(this).html());
            // Replace dropdown
            $('.selected').removeClass('selected')
            var currentCol = $(this).attr('class')
            var currentRow = $(this).parent().attr('class');
            // Replace current cell with None
            var modCurrentRow = parseInt(currentRow.charAt(currentRow.length - 1));
            var modCurrentCol = parseInt(currentCol.charAt(currentCol.length - 1));
            removeDropdown(modCurrentCol, modCurrentRow);
            moveEverythingUp(modCurrentCol, modCurrentRow);
        } else { // Choose a name
            var dropdown = `<div class='static'><input type="text" readonly class="form-control-plaintext" value="`
            var dropdown_end= `"></div>`

            var content = dropdown + name + dropdown_end
            $(this).html(content)
            
            // Move dropdown down
            var currentCol = $(this).attr('class')
            var currentRow = $(this).parent().attr('class');
            var modCurrentRow = parseInt(currentRow.charAt(currentRow.length - 1))
            var modCurrentCol = parseInt(currentCol.charAt(currentCol.length - 1))
            insertNewDropdown(modCurrentCol, modCurrentRow);
        }
    });

    // Select person to pray for
    $('.content').on("click", function() {
        var name = $(this).find('input[value]').val();
        if (name != undefined) {
            $('.selected').removeClass('selected')
            $(this).addClass('selected')
            $('.edit-person').show();
            chrome.storage.sync.get(name, function(result) {
                let value = result[name];
                $('#person-requests').find('.name').html(name);
                $('#person-requests').find('.requests').html(value);
                // Edit modal
                $('#editname').attr('value', name);
                $('#editrequests').text(value);
            });
        }
    });

    // Change person
    chrome.storage.sync.get(null, function(result) {
        $(".content").on("dblclick", function() {
            var name = $(this).find('input[value]').val();
            if (name != undefined) {
                var options = getOptions(result);
                // Select name first
                var name_options = '<option>' + name + '</option>';
                var new_dropdown = name_options + options.replace(name_options,'');
                new_dropdown += `<option>None</option>`
                var dropdown = `
                <select name="selValue" class="selectpicker form-control">`

                var dropdown_end= `</select>
                </div> `

                var content = dropdown + new_dropdown + dropdown_end
                $(this).html(content)
            }
        });
    });
};

function saveContent() {
    var saveContainerWeek = $('.container.week').html();
    saveToLocalStorage('containerWeek', saveContainerWeek);
};

function saveDates() {
    currentWeek = getCurrentWeek();
    saveToLocalStorage('mostRecentWeek', currentWeek);
};

function savePerson() {
    $(".submit.create").click(function() {
        var name = $('#newname').val();
        var requests = $('#newrequests').val();
        saveToStorage(name, requests)
    });
};

function saveEditedPerson() {
    $(".submit.edit").click(function() {
        var name = $('#editname').val();
        var requests = $('#editrequests').val();
        console.log(name, requests);
        // if name is same
        var oldName = $('#person-requests').find('.name').html();
        if (name == oldName) {
            saveToStorage(name, requests);
        } else {
            replaceAllInstances(oldName, name);
            removeFromStorage(oldName);
            saveToStorage(name, requests);
        }
    });
};

// Helper functions
function saveToStorage(key, value) {
    chrome.storage.sync.set({[key]: value}, function() {
        console.log(key, value);
    });
}

function saveToLocalStorage(key, value) {
    chrome.storage.local.set({[key]: value}, function() {
        console.log(key, value);
    });
}

function removeFromStorage(key) {
    chrome.storage.sync.remove([key], function() {
        console.log("removed key");
    });
}

function getOptions(result) {
    var options = ''
    var allKeys = Object.entries(result);
    for (let [key, value] of allKeys) {
        options += '<option>'
        options += key
        options += '</option>'
    }
    return options;
}

function insertNewDropdown(currentCol, currentRow) {
    var nextRow = currentRow + 1;
    var colNum = currentCol;
    var newCol = ".col-lg.content." + colNum;
    var row = ".row." + nextRow
    if (nextRow < 11 && $('.row.10').find(newCol).html() == "&nbsp;") {
        // If next row already exists
        chrome.storage.sync.get(null, function(result) {
            var options = getOptions(result);

            var dropdown = `
            <select name="selValue" class="selectpicker form-control">
                <option>None</option>`

            var dropdown_end= `</select>
            </div> `

            var content = dropdown + options + dropdown_end;
            $(row).find(newCol).html(content)
        });
    }
}

function removeDropdown(currentCol, currentRow) {
    var nextRow = currentRow;
    var colNum = currentCol;
    var col_name = ".col-lg.content." + colNum;
    var row_name = ".row." + nextRow
    $(col_name).find(row_name).find('.selectpicker').parent().html("&nbsp;")
}

function moveEverythingUp(currentCol, currentRow) {
    for (i = 0; i < (10 - currentRow); i++) {
        var col = ".col-lg.content." + currentCol;
        var oldRow = ".row." + (currentRow + i + 1);
        var newRow = ".row." + (currentRow + i);
        var content = $(oldRow).find(col).html();
        console.log(content);
        $(newRow).find(col).html(content);
    }
}

function getCurrentWeek() {
    var currentDays = [getDate(6), getDate(5), getDate(4), getDate(3), getDate(2), getDate(1), getDate(0)]
    return currentDays
}

function getDate(num) {
    var options = { month: '2-digit', day: '2-digit', year: 'numeric' }
    var date = new Date(Date.now() - (864e5 * num));
    return date.toLocaleString('en-US', options)
}

function setContentInCell(col, row, content) {
    var colName = '.col-lg.content.' + col;
    var rowName = '.row.' + row;
    $(rowName).find(colName).html(content);
}

function replaceAllInstances(oldName, newName) {
    $('.static').each(function() { // Going through each static cell
        var name = $(this).find('.form-control-plaintext').attr('value');
        console.log("blehhhh", name)
        if (oldName == name) {
            $(this).find('.form-control-plaintext').attr('value', newName)
        }
    });
}