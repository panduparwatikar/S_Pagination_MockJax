/**
 * @license
 * Copyright (c) 2014, 2026, Oracle and/or its affiliates.
 * Licensed under The Universal Permissive License (UPL), Version 1.0
 * as shown at https://oss.oracle.com/licenses/upl/
 * @ignore
 */
/**
 * A top-level require call executed by the Application.
 * Although 'knockout' would be loaded in any case (it is specified as a  dependency
 * by some modules), we are listing it explicitly to get the reference to the 'ko'
 * object in the callback
 */
require(['ojs/ojbootstrap', 'ojs/ojcontext', 'knockout', 'ojs/ojmodel', 'ojs/ojpagingdataproviderview', 'ojs/ojcollectiondataprovider',
  './jquery.mockjax.min', 'ojs/ojknockout', 'ojs/ojtable', 'ojs/ojpagingcontrol',
  'ojs/ojbutton', 'ojs/ojtoolbar'],
  function (Bootstrap, Context, ko, ModelClass, PagingDataProviderView, CollectionDataProvider) {
    Bootstrap.whenDocumentReady().then(
      function () {
        var self;

        function init() {
          class ViewModel {
            constructor() {
              self = this;
              self.limit = ko.observable(50);
              self.offset = ko.observable(0);
              self.serviceURL = '/api/data/photos?_start=' + self.offset() + '&_limit=' + self.limit();

              $.mockjax({
                url: /^\/api\/data\/photos\?_start=[0-9]+&_limit=[0-9]+(?:&limit=[0-9]+&offset=[0-9]+&totalResults=true)?$/,
                type: 'GET',
                response: function (settings, done) {
                  var mockSelf = this;

                  return (async function () {
                    let response = await fetch('https://jsonplaceholder.typicode.com/photos?_start=' + self.offset() + '&_limit=' + self.limit());
                    let json = await response.json();
                    let resp = {};
                    resp.hasMore = true;
                    resp.limit = self.limit();
                    resp.data = [...json]
                    mockSelf.responseText = resp;
                    resp.hasMore = true;
                    // Adding the below property makes the collection virtual
                    // resp.totalResults=5000;
                    done();
                  })()
                }
              });

              self.parsePhoto = (response) => {
                return { ...response, "color": (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0') };
              };



              self.photoModel = ModelClass.Model.extend({
                urlRoot: self.serviceURL,
                parse: self.parsePhoto,
                idAttribute: 'id'
              });

              self.myPhoto = new self.photoModel();
              self.photoCollection = ModelClass.Collection.extend({
                url: self.serviceURL,
                model: self.myPhoto
              });

              self.collection = new self.photoCollection();

              //Commenting below will make the Collection Non-Virtual
              //Non-Virtual means the numbers of rows are alreayd knows
              //CRUD Operations are all possible in non-virtual collections only
              //In Virtual collections Create, Update and Delete are not easily supported

              // self.collection.customPagingOptions = (response) => {
              //   return {
              //     totalResults: 5000,
              //     hasMore: true,
              //     fetchSize: 100
              //   }
              // }

              self.collection.customURL = (oprtn, collctn, optns) => {
                if (oprtn == 'read') {
                  console.log("Operation read");
                  console.log("OPTIONS ARE ", optns)
                  if (optns.startIndex)
                    self.offset(optns.startIndex);
                  self.serviceURL = '/api/data/photos?_start=' + self.offset() + '&_limit=' + self.limit();
                  return { 'url': self.serviceURL, 'type': 'GET' };
                }
                return null;
              }

              self.pdp = new PagingDataProviderView(new CollectionDataProvider(self.collection));
              self.pdp.addEventListener("PAGE", (event) => {
                console.log("PAGE EVENT ", event);
                if (event.detail.page == (self.pdp.getPageCount() - 1)) {
                  self.offset(self.offset() + self.limit());
                  console.log("OFFSET IS ", self.offset());
                  self.serviceURL = '/api/data/photos?_start=' + self.offset() + '&_limit=' + self.limit();
                  //$(".oj-table")[0].data.dataProvider.collection.fetch({add:true});

                  $.ajax({
                    url: self.serviceURL,
                    type: 'GET'
                  }).done((resp) => {
                    resp.data.forEach((row,index) => {
                      let newModel = new ModelClass.Model({
                        ...row,
                        "color": (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')
                      });

                      $(".oj-table")[0].data.dataProvider.collection.add(newModel, { at: self.offset()+index });
                    });
                  });
                }
              })

              self.columns = [{ "field": "title", "headerText": "Title", "sortable": "disabled" },
              { "field": "color", "template": "photoImg", "headerText": "Image", "sortable": "disabled" },
              { "template": "deleteRow", "headerText": "Delete", "sortable": "disabled" }];
            }
          }

          ViewModel.prototype.deleteRow = (row) => {
            let model = $(".oj-table")[0].data.dataProvider.collection.get(row.key);
            $(".oj-table")[0].data.dataProvider.collection.remove(model);
          }

          ViewModel.prototype.addRow = () => {
            let newModel = new ModelClass.Model({
              "almbumId": 1,
              "id": new Date().getTime(),
              "title": "New Photo",
              "thumbnailUrl": "https://via.placeholder.com/150/92c952",
              "color": (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')
            });

            let startItemIndex = $(".oj-table")[0].data.getStartItemIndex();
            $(".oj-table")[0].data.dataProvider.collection.add(newModel, { at: startItemIndex });
          }

          ko.applyBindings(new ViewModel());
        }
        // If running in a hybrid (e.g. Cordova) environment, we need to wait for the deviceready
        // event before executing any code that might interact with Cordova APIs or plugins.
        if (document.body.classList.contains('oj-hybrid')) {
          document.addEventListener('deviceready', init);
        } else {
          init();
        }
        // release the application bootstrap busy state
        Context.getPageContext().getBusyContext().applicationBootstrapComplete();

      });
  }
);
