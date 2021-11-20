//Hold db connect
let db;

//connect to the db
const request = indexedDB.open('budget_tracker', 1);

//save ref to db, create table for new transactions
request.onupgradeneeded = function(event) {
  const db = event.target.result;
  db.createObjectStore('new_transact', { autoIncrement: true });
};

//if succesfull
request.onsuccess = function(event) {
  // when db is successfully created with its object store (from onupgradedneeded event above), save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run checkDatabase() function to send all local db data to api
  if (navigator.onLine) {
    uploadTransact();
  }
};

request.onerror = function(event) {
  // log error here
  console.log(event.target.errorCode);
};

//function for offline saving 
function saveRecord(record) {
  const transaction = db.transaction(['new_transact'], 'readwrite');

  const transObjectStore = transaction.objectStore('new_transact');

  // add record to your store with add method.
  transObjectStore.add(record);
}

function uploadTransact() {
  // open a transaction on your pending db
  const transaction = db.transaction(['new_transact'], 'readwrite');

  // access your pending object store
  const transObjectStore = transaction.objectStore('new_transact');

  // get all records from store and set to a variable
  const getAll = transObjectStore.getAll();

  getAll.onsuccess = function() {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          const transaction = db.transaction(['new_transact'], 'readwrite');
          const transObjectStore = transaction.objectStore('new_transact');
          // clear all items in your store
          transObjectStore.clear();
        })
        .catch(err => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', uploadTransact);
