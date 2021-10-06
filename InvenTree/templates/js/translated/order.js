{% load i18n %}
{% load inventree_extras %}

/* globals
    companyFormFields,
    constructForm,
    createSupplierPart,
    global_settings,
    imageHoverIcon,
    inventreeGet,
    launchModalForm,
    loadTableFilters,
    makeIconBadge,
    purchaseOrderStatusDisplay,
    renderLink,
    salesOrderStatusDisplay,
    setupFilterList,
*/

/* exported
    createSalesOrder,
    editPurchaseOrderLineItem,
    loadPurchaseOrderLineItemTable,
    loadPurchaseOrderTable,
    loadSalesOrderAllocationTable,
    loadSalesOrderLineItemTable,
    loadSalesOrderTable,
    newPurchaseOrderFromOrderWizard,
    newSupplierPartFromOrderWizard,
    removeOrderRowFromOrderWizard,
    removePurchaseOrderLineItem,
*/

// Create a new SalesOrder
function createSalesOrder(options={}) {

    constructForm('{% url "api-so-list" %}', {
        method: 'POST',
        fields: {
            reference: {
                prefix: global_settings.SALESORDER_REFERENCE_PREFIX,
            },
            customer: {
                value: options.customer,
                secondary: {
                    title: '{% trans "Add Customer" %}',
                    fields: function() {
                        var fields = companyFormFields();
                        
                        fields.is_customer.value = true;

                        return fields;
                    }
                }
            },
            customer_reference: {},
            description: {},
            target_date: {
                icon: 'fa-calendar-alt',
            },
            link: {
                icon: 'fa-link',
            },
            responsible: {
                icon: 'fa-user',
            }
        },
        onSuccess: function(data) {
            location.href = `/order/sales-order/${data.pk}/`;
        },
        title: '{% trans "Create Sales Order" %}',
    });
}

// Create a new PurchaseOrder
function createPurchaseOrder(options={}) {

    constructForm('{% url "api-po-list" %}', {
        method: 'POST',
        fields: {
            reference: {
                prefix: global_settings.PURCHASEORDER_REFERENCE_PREFIX,
            },
            supplier: {
                value: options.supplier,
                secondary: {
                    title: '{% trans "Add Supplier" %}',
                    fields: function() {
                        var fields = companyFormFields();

                        fields.is_supplier.value = true;

                        return fields;
                    }
                }
            },
            supplier_reference: {},
            description: {},
            target_date: {
                icon: 'fa-calendar-alt',
            },
            link: {
                icon: 'fa-link',
            },
            responsible: {
                icon: 'fa-user',
            }
        },
        onSuccess: function(data) {

            if (options.onSuccess) {
                options.onSuccess(data);
            } else {
                // Default action is to redirect browser to the new PO
                location.href = `/order/purchase-order/${data.pk}/`;
            }
        },
        title: '{% trans "Create Purchase Order" %}',
    });
}


function removeOrderRowFromOrderWizard(e) {
    /* Remove a part selection from an order form. */

    e = e || window.event;

    var src = e.target || e.srcElement;

    var row = $(src).attr('row');

    $('#' + row).remove();
}

function newSupplierPartFromOrderWizard(e) {
    /* Create a new supplier part directly from an order form.
     * Launches a secondary modal and (if successful),
     * back-populates the selected row.
     */

    e = e || window.event;

    var src = e.srcElement || e.target;

    var part = $(src).attr('part');

    if (!part) {
        part = $(src).closest('button').attr('part');
    }

    createSupplierPart({
        part: part,
        onSuccess: function(data) {
                        
            // TODO: 2021-08-23 - This whole form wizard needs to be refactored.
            // In the future, use the API forms functionality to add the new item
            // For now, this hack will have to do...

            var dropdown = `#id_supplier_part_${part}`;

            var pk = data.pk;

            inventreeGet(
                `/api/company/part/${pk}/`,
                {
                    supplier_detail: true,
                },
                {
                    success: function(response) {
                        var text = '';

                        if (response.supplier_detail) {
                            text += response.supplier_detail.name;
                            text += ' | ';
                        }

                        text += response.SKU;

                        var option = new Option(text, pk, true, true);

                        $('#modal-form').find(dropdown).append(option).trigger('change');
                    }
                }
            );
        }
    });
}

function newPurchaseOrderFromOrderWizard(e) {
    /* Create a new purchase order directly from an order form.
     * Launches a secondary modal and (if successful),
     * back-fills the newly created purchase order.
     */

    e = e || window.event;

    var src = e.target || e.srcElement;

    var supplier = $(src).attr('supplierid');

    createPurchaseOrder({
        supplier: supplier,
        onSuccess: function(data) {

            // TODO: 2021-08-23 - The whole form wizard needs to be refactored
            // In the future, the drop-down should be using a dynamic AJAX request
            // to fill out the select2 options!

            var pk = data.pk;

            inventreeGet(
                `/api/order/po/${pk}/`,
                {
                    supplier_detail: true,
                },
                {
                    success: function(response) {
                        var text = global_settings.PURCHASEORDER_REFERENCE_PREFIX || '';

                        text += response.reference;

                        if (response.supplier_detail) {
                            text += ` ${response.supplier_detail.name}`;
                        }

                        var dropdown = `#id-purchase-order-${supplier}`;

                        var option = new Option(text, pk, true, true);
            
                        $('#modal-form').find(dropdown).append(option).trigger('change');
                    }
                }
            );
        }
    }); 
}

function editPurchaseOrderLineItem(e) {

    /* Edit a purchase order line item in a modal form.
     */

    e = e || window.event;

    var src = e.target || e.srcElement;

    var url = $(src).attr('url');

    launchModalForm(url, {
        reload: true,
    });
}

function removePurchaseOrderLineItem(e) {

    /* Delete a purchase order line item in a modal form 
     */

    e = e || window.event;

    var src = e.target || e.srcElement;

    var url = $(src).attr('url');

    launchModalForm(url, {
        reload: true,
    });
}


function loadPurchaseOrderTable(table, options) {
    /* Create a purchase-order table */

    options.params = options.params || {};

    options.params['supplier_detail'] = true;

    var filters = loadTableFilters('purchaseorder');

    for (var key in options.params) {
        filters[key] = options.params[key];
    }

    options.url = options.url || '{% url "api-po-list" %}';

    setupFilterList('purchaseorder', $(table));

    $(table).inventreeTable({
        url: options.url,
        queryParams: filters,
        name: 'purchaseorder',
        groupBy: false,
        sidePagination: 'server',
        original: options.params,
        formatNoMatches: function() {
            return '{% trans "No purchase orders found" %}';
        },
        columns: [
            {
                title: '',
                visible: true,
                checkbox: true,
                switchable: false,
            },
            {
                field: 'reference',
                title: '{% trans "Purchase Order" %}',
                sortable: true,
                switchable: false,
                formatter: function(value, row) {

                    var prefix = global_settings.PURCHASEORDER_REFERENCE_PREFIX;

                    if (prefix) {
                        value = `${prefix}${value}`;
                    }

                    var html = renderLink(value, `/order/purchase-order/${row.pk}/`);

                    if (row.overdue) {
                        html += makeIconBadge('fa-calendar-times icon-red', '{% trans "Order is overdue" %}');
                    }

                    return html;
                }
            },  
            {
                field: 'supplier_detail',
                title: '{% trans "Supplier" %}',
                sortable: true,
                sortName: 'supplier__name',
                formatter: function(value, row) {
                    return imageHoverIcon(row.supplier_detail.image) + renderLink(row.supplier_detail.name, `/company/${row.supplier}/purchase-orders/`);
                }
            },
            {
                field: 'supplier_reference',
                title: '{% trans "Supplier Reference" %}',
            },
            {
                field: 'description',
                title: '{% trans "Description" %}',
            },
            {
                field: 'status',
                title: '{% trans "Status" %}',
                sortable: true,
                formatter: function(value, row) {
                    return purchaseOrderStatusDisplay(row.status, row.status_text);
                }
            },
            {
                field: 'creation_date',
                title: '{% trans "Date" %}',
                sortable: true,
            },
            {
                field: 'target_date',
                title: '{% trans "Target Date" %}',
                sortable: true,
            },
            {
                field: 'line_items',
                title: '{% trans "Items" %}',
                sortable: true,
            },
        ],
    });
}


/**
 * Load a table displaying line items for a particular PurchasesOrder
 * @param {String} table - HTML ID tag e.g. '#table' 
 * @param {Object} options - options which must provide:
 *      - order (integer PK)
 *      - supplier (integer PK)
 *      - allow_edit (boolean)
 *      - allow_receive (boolean)
 */
function loadPurchaseOrderLineItemTable(table, options={}) {

    function setupCallbacks() {
        if (options.allow_edit) {
            $(table).find('.button-line-edit').click(function() {
                var pk = $(this).attr('pk');

                constructForm(`/api/order/po-line/${pk}/`, {
                    fields: {
                        part: {
                            filters: {
                                part_detail: true,
                                supplier_detail: true,
                                supplier: options.supplier,
                            }
                        },
                        quantity: {},
                        reference: {},
                        purchase_price: {},
                        purchase_price_currency: {},
                        destination: {},
                        notes: {},
                    },
                    title: '{% trans "Edit Line Item" %}',
                    onSuccess: function() {
                        $(table).bootstrapTable('refresh');
                    }
                });
            });

            $(table).find('.button-line-delete').click(function() {
                var pk = $(this).attr('pk');

                constructForm(`/api/order/po-line/${pk}/`, {
                    method: 'DELETE',
                    title: '{% trans "Delete Line Item" %}',
                    onSuccess: function() {
                        $(table).bootstrapTable('refresh');
                    }
                });
            });
        }

        if (options.allow_receive) {
            $(table).find('.button-line-receive').click(function() {
                var pk = $(this).attr('pk');

                launchModalForm(`/order/purchase-order/${options.order}/receive/`, {
                    success: function() {
                        $(table).bootstrapTable('refresh');
                    },
                    data: {
                        line: pk,
                    },
                    secondary: [
                        {
                            field: 'location',
                            label: '{% trans "New Location" %}',
                            title: '{% trans "Create new stock location" %}',
                            url: '{% url "stock-location-create" %}',
                        },
                    ]
                });
            });
        }
    }

    $(table).inventreeTable({
        onPostBody: setupCallbacks,
        name: 'purchaseorderlines',
        sidePagination: 'server',
        formatNoMatches: function() {
            return '{% trans "No line items found" %}';
        },
        queryParams: {
            order: options.order,
            part_detail: true
        },
        url: '{% url "api-po-line-list" %}',
        showFooter: true,
        columns: [
            {
                field: 'pk',
                title: 'ID',
                visible: false,
                switchable: false,
            },
            {
                field: 'part',
                sortable: true,
                sortName: 'part_name',
                title: '{% trans "Part" %}',
                switchable: false,
                formatter: function(value, row, index, field) {
                    if (row.part) {
                        return imageHoverIcon(row.part_detail.thumbnail) + renderLink(row.part_detail.full_name, `/part/${row.part_detail.pk}/`);
                    } else { 
                        return '-';
                    }
                },
                footerFormatter: function() {
                    return '{% trans "Total" %}';
                }
            },
            {
                field: 'part_detail.description',
                title: '{% trans "Description" %}',
            },
            {
                sortable: true,
                sortName: 'SKU',
                field: 'supplier_part_detail.SKU',
                title: '{% trans "SKU" %}',
                formatter: function(value, row, index, field) {
                    if (value) {
                        return renderLink(value, `/supplier-part/${row.part}/`);
                    } else {
                        return '-';
                    }
                },
            },
            {
                sortable: true,
                sortName: 'MPN',
                field: 'supplier_part_detail.manufacturer_part_detail.MPN',
                title: '{% trans "MPN" %}',
                formatter: function(value, row, index, field) {
                    if (row.supplier_part_detail && row.supplier_part_detail.manufacturer_part) {
                        return renderLink(value, `/manufacturer-part/${row.supplier_part_detail.manufacturer_part}/`);
                    } else {
                        return '-';
                    }
                },
            },
            {
                sortable: true,
                field: 'reference',
                title: '{% trans "Reference" %}',
            },
            {
                sortable: true,
                field: 'quantity',
                title: '{% trans "Quantity" %}',
                footerFormatter: function(data) {
                    return data.map(function(row) {
                        return +row['quantity'];
                    }).reduce(function(sum, i) {
                        return sum + i;
                    }, 0);
                }
            },
            {
                sortable: true,
                field: 'purchase_price',
                title: '{% trans "Unit Price" %}',
                formatter: function(value, row) {
                    return row.purchase_price_string || row.purchase_price;
                }
            },
            {
                field: 'total_price',
                sortable: true,
                field: 'total_price',
                title: '{% trans "Total price" %}',
                formatter: function(value, row) {
                    var total = row.purchase_price * row.quantity;
                    var formatter = new Intl.NumberFormat('en-US', {style: 'currency', currency: row.purchase_price_currency});
                    return formatter.format(total);
                },
                footerFormatter: function(data) {
                    var total = data.map(function(row) {
                        return +row['purchase_price']*row['quantity'];
                    }).reduce(function(sum, i) {
                        return sum + i;
                    }, 0);

                    var currency = (data.slice(-1)[0] && data.slice(-1)[0].purchase_price_currency) || 'USD';

                    var formatter = new Intl.NumberFormat(
                        'en-US',
                        {
                            style: 'currency',
                            currency: currency
                        }
                    );
                    
                    return formatter.format(total);
                }
            },
            {
                sortable: false,
                field: 'received',
                switchable: false,
                title: '{% trans "Received" %}',
                formatter: function(value, row, index, field) {
                    return makeProgressBar(row.received, row.quantity, {
                        id: `order-line-progress-${row.pk}`,
                    });
                },
                sorter: function(valA, valB, rowA, rowB) {
    
                    if (rowA.received == 0 && rowB.received == 0) {
                        return (rowA.quantity > rowB.quantity) ? 1 : -1;
                    }
    
                    var progressA = parseFloat(rowA.received) / rowA.quantity;
                    var progressB = parseFloat(rowB.received) / rowB.quantity;
    
                    return (progressA < progressB) ? 1 : -1;
                }
            },
            {
                field: 'destination',
                title: '{% trans "Destination" %}',
                formatter: function(value, row) {
                    if (value) {
                        return renderLink(row.destination_detail.pathstring, `/stock/location/${value}/`);
                    } else {
                        return '-';
                    }
                }
            },
            {
                field: 'notes',
                title: '{% trans "Notes" %}',
            },
            {
                switchable: false,
                field: 'buttons',
                title: '',
                formatter: function(value, row, index, field) {
                    var html = `<div class='btn-group'>`;
    
                    var pk = row.pk;
    
                    if (options.allow_edit) {
                        html += makeIconButton('fa-edit icon-blue', 'button-line-edit', pk, '{% trans "Edit line item" %}');
                        html += makeIconButton('fa-trash-alt icon-red', 'button-line-delete', pk, '{% trans "Delete line item" %}');
                    }

                    if (options.allow_receive && row.received < row.quantity) {
                        html += makeIconButton('fa-clipboard-check', 'button-line-receive', pk, '{% trans "Receive line item" %}');
                    }
        
                    html += `</div>`;
    
                    return html;
                },
            }
        ]
    });

}


function loadSalesOrderTable(table, options) {

    options.params = options.params || {};
    options.params['customer_detail'] = true;

    var filters = loadTableFilters('salesorder');

    for (var key in options.params) {
        filters[key] = options.params[key];
    }

    options.url = options.url || '{% url "api-so-list" %}';

    setupFilterList('salesorder', $(table));

    $(table).inventreeTable({
        url: options.url,
        queryParams: filters,
        name: 'salesorder',
        groupBy: false,
        sidePagination: 'server',
        original: options.params,
        formatNoMatches: function() {
            return '{% trans "No sales orders found" %}';
        },
        columns: [
            {
                title: '',
                checkbox: true,
                visible: true,
                switchable: false,
            },
            {
                sortable: true,
                field: 'reference',
                title: '{% trans "Sales Order" %}',
                formatter: function(value, row) {

                    var prefix = global_settings.SALESORDER_REFERENCE_PREFIX;

                    if (prefix) {
                        value = `${prefix}${value}`;
                    }

                    var html = renderLink(value, `/order/sales-order/${row.pk}/`);

                    if (row.overdue) {
                        html += makeIconBadge('fa-calendar-times icon-red', '{% trans "Order is overdue" %}');
                    }

                    return html;
                },
            },
            {
                sortable: true,
                sortName: 'customer__name',
                field: 'customer_detail',
                title: '{% trans "Customer" %}',
                formatter: function(value, row) {

                    if (!row.customer_detail) {
                        return '{% trans "Invalid Customer" %}';
                    }

                    return imageHoverIcon(row.customer_detail.image) + renderLink(row.customer_detail.name, `/company/${row.customer}/sales-orders/`);
                }
            },
            {
                sortable: true,
                field: 'customer_reference',
                title: '{% trans "Customer Reference" %}',
            },
            {
                sortable: false,
                field: 'description',
                title: '{% trans "Description" %}',
            },
            {
                sortable: true,
                field: 'status',
                title: '{% trans "Status" %}',
                formatter: function(value, row) {
                    return salesOrderStatusDisplay(row.status, row.status_text);
                }
            },
            {
                sortable: true,
                field: 'creation_date',
                title: '{% trans "Creation Date" %}',
            },
            {
                sortable: true,
                field: 'target_date',
                title: '{% trans "Target Date" %}',
            },
            {
                sortable: true,
                field: 'shipment_date',
                title: '{% trans "Shipment Date" %}',
            },
            {
                sortable: true,
                field: 'line_items',
                title: '{% trans "Items" %}'
            },
        ],
    });
}


function loadSalesOrderAllocationTable(table, options={}) {
    /**
     * Load a table with SalesOrderAllocation items
     */

    options.params = options.params || {};

    options.params['location_detail'] = true;
    options.params['part_detail'] = true;
    options.params['item_detail'] = true;
    options.params['order_detail'] = true;

    var filters = loadTableFilters('salesorderallocation');

    for (var key in options.params) {
        filters[key] = options.params[key];
    }

    setupFilterList('salesorderallocation', $(table));

    $(table).inventreeTable({
        url: '{% url "api-so-allocation-list" %}',
        queryParams: filters,
        name: 'salesorderallocation',
        groupBy: false,
        search: false,
        paginationVAlign: 'bottom',
        original: options.params,
        formatNoMatches: function() {
            return '{% trans "No sales order allocations found" %}';
        },
        columns: [
            {
                field: 'pk',
                visible: false,
                switchable: false,
            },
            {
                field: 'order',
                switchable: false,
                title: '{% trans "Order" %}',
                formatter: function(value, row) {

                    var prefix = global_settings.SALESORDER_REFERENCE_PREFIX;

                    var ref = `${prefix}${row.order_detail.reference}`;

                    return renderLink(ref, `/order/sales-order/${row.order}/`);
                }
            },
            {
                field: 'item',
                title: '{% trans "Stock Item" %}',
                formatter: function(value, row) {
                    // Render a link to the particular stock item

                    var link = `/stock/item/${row.item}/`;
                    var text = `{% trans "Stock Item" %} ${row.item}`;

                    return renderLink(text, link);
                }
            },
            {
                field: 'location',
                title: '{% trans "Location" %}',
                formatter: function(value, row) {

                    if (!value) {
                        return '{% trans "Location not specified" %}';
                    }
                    
                    var link = `/stock/location/${value}`;
                    var text = row.location_detail.description;

                    return renderLink(text, link);
                }
            },
            {
                field: 'quantity',
                title: '{% trans "Quantity" %}',
                sortable: true,
            }
        ]
    });
}


/**
 * Display an "allocations" sub table, showing stock items allocated againt a sales order
 * @param {*} index 
 * @param {*} row 
 * @param {*} element 
 */
function showAllocationSubTable(index, row, element, options) {
    
    // Construct a sub-table element
    var html = `
    <div class='sub-table'>
        <table class='table table-striped table-condensed' id='allocation-table-${row.pk}'>
        </table>
    </div>`;

    element.html(html);

    var table = $(`#allocation-table-${row.pk}`);

    // Is the parent SalesOrder pending?
    var pending = options.status == {{ SalesOrderStatus.PENDING }};

    // Function to reload the allocation table
    function reloadTable() {
        table.bootstrapTable('refresh');
    }

    function setupCallbacks() {
        // Add callbacks for 'edit' buttons
        table.find('.button-allocation-edit').click(function() {

            var pk = $(this).attr('pk');

            // TODO: Migrate to API forms
            launchModalForm(`/order/sales-order/allocation/${pk}/edit/`, {
                success: reloadTable,
            });
        });

        // Add callbacks for 'delete' buttons
        table.find('.button-allocation-delete').click(function() {
            var pk = $(this).attr('pk');
            
            // TODO: Migrate to API forms
            launchModalForm(`/order/sales-order/allocation/${pk}/delete/`, {
                success: reloadTable, 
            });
        });
    }

    table.bootstrapTable({
        onPostBody: setupCallbacks,
        data: row.allocations,
        showHeader: false,
        columns: [
            {
                field: 'allocated',
                title: '{% trans "Quantity" %}',
                formatter: function(value, row, index, field) {
                    var text = '';

                    if (row.serial != null && row.quantity == 1) {
                        text = `{% trans "Serial Number" %}: ${row.serial}`;
                    } else {
                        text = `{% trans "Quantity" %}: ${row.quantity}`;
                    }

                    return renderLink(text, `/stock/item/${row.item}/`);
                },
            },
            {
                field: 'location',
                title: '{% trans "Location" %}',
                formatter: function(value, row, index, field) {

                    // Location specified
                    if (row.location) {
                        return renderLink(
                            row.location_detail.pathstring || '{% trans "Location" %}',
                            `/stock/location/${row.location}/`
                        );
                    } else {
                        return `<i>{% trans "Stock location not specified" %}`;
                    }
                },
            },
            // TODO: ?? What is 'po' field all about?
            /*
            {
                field: 'po'
            },
            */
            {
                field: 'buttons',
                title: '{% trans "Actions" %}',
                formatter: function(value, row, index, field) {

                    var html = `<div class='btn-group float-right' role='group'>`;
                    var pk = row.pk;

                    if (pending) {
                        html += makeIconButton('fa-edit icon-blue', 'button-allocation-edit', pk, '{% trans "Edit stock allocation" %}');
                        html += makeIconButton('fa-trash-alt icon-red', 'button-allocation-delete', pk, '{% trans "Delete stock allocation" %}');
                    }

                    html += '</div>';

                    return html;
                },
            },
        ],
    });
}

/**
 * Display a "fulfilled" sub table, showing stock items fulfilled against a purchase order
 */
function showFulfilledSubTable(index, row, element, options) {
    // Construct a table showing stock items which have been fulfilled against this line item

    if (!options.order) {
        return 'ERROR: Order ID not supplied';
    }

    var id = `fulfilled-table-${row.pk}`;
    
    var html = `
    <div class='sub-table'>
        <table class='table table-striped table-condensed' id='${id}'>
        </table>
    </div>`;

    element.html(html);

    $(`#${id}`).bootstrapTable({
        url: '{% url "api-stock-list" %}',
        queryParams: {
            part: row.part,
            sales_order: options.order,
        },
        showHeader: false,
        columns: [
            {
                field: 'pk',
                visible: false,
            },
            {
                field: 'stock',
                formatter: function(value, row) {
                    var text = '';
                    if (row.serial && row.quantity == 1) {
                        text = `{% trans "Serial Number" %}: ${row.serial}`;
                    } else {
                        text = `{% trans "Quantity" %}: ${row.quantity}`;
                    }

                    return renderLink(text, `/stock/item/${row.pk}/`);
                },
            },
            /*
            {
                field: 'po'
            },
            */
        ],
    });
}


/**
 * Load a table displaying line items for a particular SalesOrder
 * 
 * @param {String} table : HTML ID tag e.g. '#table'
 * @param {Object} options : object which contains:
 *      - order {integer} : pk of the SalesOrder
 *      - status: {integer} : status code for the order
 */
function loadSalesOrderLineItemTable(table, options={}) {

    options.params = options.params || {};

    if (!options.order) {
        console.log('ERROR: function called without order ID');
        return;
    }

    if (!options.status) {
        console.log('ERROR: function called without order status');
        return;
    }

    options.params.order = options.order;
    options.params.part_detail = true;
    options.params.allocations = true;
    
    var filters = loadTableFilters('salesorderlineitem');

    for (var key in options.params) {
        filters[key] = options.params[key];
    }

    options.url = options.url || '{% url "api-so-line-list" %}';

    var filter_target = options.filter_target || '#filter-list-sales-order-lines';

    setupFilterList('salesorderlineitems', $(table), filter_target);

    // Is the order pending?
    var pending = options.status == {{ SalesOrderStatus.PENDING }};

    // Has the order shipped?
    var shipped = options.status == {{ SalesOrderStatus.SHIPPED }};

    // Show detail view if the PurchaseOrder is PENDING or SHIPPED
    var show_detail = pending || shipped;

    // Table columns to display
    var columns = [
        /*
        {
            checkbox: true,
            visible: true,
            switchable: false,
        },
        */
        {
            sortable: true,
            sortName: 'part__name',
            field: 'part',
            title: '{% trans "Part" %}',
            switchable: false,
            formatter: function(value, row, index, field) {
                if (row.part) {
                    return imageHoverIcon(row.part_detail.thumbnail) + renderLink(row.part_detail.full_name, `/part/${value}/`);
                } else {
                    return '-';
                }
            },
            footerFormatter: function() {
                return '{% trans "Total" %}';
            },
        },
        {
            sortable: true,
            field: 'reference',
            title: '{% trans "Reference" %}',
            switchable: false,
        },
        {
            sortable: true,
            field: 'quantity',
            title: '{% trans "Quantity" %}',
            footerFormatter: function(data) {
                return data.map(function(row) {
                    return +row['quantity'];
                }).reduce(function(sum, i) {
                    return sum + i;
                }, 0);
            },
            switchable: false,
        },
        {
            sortable: true,
            field: 'sale_price',
            title: '{% trans "Unit Price" %}',
            formatter: function(value, row) {
                return row.sale_price_string || row.sale_price;
            }
        },
        {
            sortable: true,
            title: '{% trans "Total price" %}',
            formatter: function(value, row) {
                var total = row.sale_price * row.quantity;
                var formatter = new Intl.NumberFormat(
                    'en-US',
                    {
                        style: 'currency',
                        currency: row.sale_price_currency
                    }
                );

                return formatter.format(total);
            },
            footerFormatter: function(data) {
                var total = data.map(function(row) {
                    return +row['sale_price'] * row['quantity'];
                }).reduce(function(sum, i) {
                    return sum + i;
                }, 0);

                var currency = (data.slice(-1)[0] && data.slice(-1)[0].sale_price_currency) || 'USD';
                
                var formatter = new Intl.NumberFormat(
                    'en-US',
                    {
                        style: 'currency', 
                        currency: currency
                    }
                );
                
                return formatter.format(total);
            }
        },
        {
            field: 'stock',
            title: '{% trans "In Stock" %}',
            formatter: function(value, row) {
                return row.part_detail.stock;
            },
        },
        {
            field: 'allocated',
            title: pending ? '{% trans "Allocated" %}' : '{% trans "Fulfilled" %}',
            switchable: false,
            formatter: function(value, row, index, field) {

                var quantity = pending ? row.allocated : row.fulfilled;
                return makeProgressBar(quantity, row.quantity, {
                    id: `order-line-progress-${row.pk}`,
                });
            },
            sorter: function(valA, valB, rowA, rowB) {

                var A = pending ? rowA.allocated : rowA.fulfilled;
                var B = pending ? rowB.allocated : rowB.fulfilled;

                if (A == 0 && B == 0) {
                    return (rowA.quantity > rowB.quantity) ? 1 : -1;
                }

                var progressA = parseFloat(A) / rowA.quantity;
                var progressB = parseFloat(B) / rowB.quantity;

                return (progressA < progressB) ? 1 : -1;
            }
        },
        {
            field: 'notes',
            title: '{% trans "Notes" %}',
        },
        // TODO: Re-introduce the "PO" field, once it is fixed
        /*
        {
            field: 'po',
            title: '{% trans "PO" %}',
            formatter: function(value, row, index, field) {
                var po_name = "";
                if (row.allocated) {
                    row.allocations.forEach(function(allocation) {
                        if (allocation.po != po_name) {
                            if (po_name) {
                                po_name = "-";
                            } else {
                                po_name = allocation.po
                            }
                        }
                    })
                }
                return `<div>` + po_name + `</div>`;
            }
        },
        */
    ];

    if (pending) {
        columns.push({
            field: 'buttons',
            formatter: function(value, row, index, field) {

                var html = `<div class='btn-group float-right' role='group'>`;

                var pk = row.pk;

                if (row.part) {
                    var part = row.part_detail;

                    if (part.trackable) {
                        html += makeIconButton('fa-hashtag icon-green', 'button-add-by-sn', pk, '{% trans "Allocate serial numbers" %}');
                    }

                    html += makeIconButton('fa-sign-in-alt icon-green', 'button-add', pk, '{% trans "Allocate stock" %}');

                    if (part.purchaseable) {
                        html += makeIconButton('fa-shopping-cart', 'button-buy', row.part, '{% trans "Purchase stock" %}');
                    }

                    if (part.assembly) {
                        html += makeIconButton('fa-tools', 'button-build', row.part, '{% trans "Build stock" %}');
                    }

                    html += makeIconButton('fa-dollar-sign icon-green', 'button-price', pk, '{% trans "Calculate price" %}');
                }

                html += makeIconButton('fa-edit icon-blue', 'button-edit', pk, '{% trans "Edit line item" %}');
                html += makeIconButton('fa-trash-alt icon-red', 'button-delete', pk, '{% trans "Delete line item " %}');

                html += `</div>`;

                return html;
            }
        });
    } else {
        // Remove the "in stock" column
        delete columns['stock'];
    }

    function reloadTable() {
        $(table).bootstrapTable('refresh');
    }

    // Configure callback functions once the table is loaded
    function setupCallbacks() {

        // Callback for editing line items
        $(table).find('.button-edit').click(function() {
            var pk = $(this).attr('pk');

            constructForm(`/api/order/so-line/${pk}/`, {
                fields: {
                    quantity: {},
                    reference: {},
                    sale_price: {},
                    sale_price_currency: {},
                    notes: {},
                },
                title: '{% trans "Edit Line Item" %}',
                onSuccess: reloadTable,
            });
        });

        // Callback for deleting line items
        $(table).find('.button-delete').click(function() {
            var pk = $(this).attr('pk');

            constructForm(`/api/order/so-line/${pk}/`, {
                method: 'DELETE',
                title: '{% trans "Delete Line Item" %}',
                onSuccess: reloadTable,
            });
        });

        // Callback for allocating stock items by serial number
        $(table).find('.button-add-by-sn').click(function() {
            var pk = $(this).attr('pk');

            // TODO: Migrate this form to the API forms
            inventreeGet(`/api/order/so-line/${pk}/`, {},
                {
                    success: function(response) {
                        launchModalForm('{% url "so-assign-serials" %}', {
                            success: reloadTable,
                            data: {
                                line: pk,
                                part: response.part, 
                            }
                        });
                    }
                }
            );
        });

        // Callback for allocation stock items to the order
        $(table).find('.button-add').click(function() {
            var pk = $(this).attr('pk');

            // TODO: Migrate this form to the API forms
            launchModalForm(`/order/sales-order/allocation/new/`, {
                success: reloadTable,
                data: {
                    line: pk,
                },
            });
        });

        // Callback for creating a new build
        $(table).find('.button-build').click(function() {
            var pk = $(this).attr('pk');

            // Extract the row data from the table!
            var idx = $(this).closest('tr').attr('data-index');
    
            var row = $(table).bootstrapTable('getData')[idx];
    
            var quantity = 1;
    
            if (row.allocated < row.quantity) {
                quantity = row.quantity - row.allocated;
            }

            // Create a new build order
            newBuildOrder({
                part: pk,
                sales_order: options.order,
                quantity: quantity,
                success: reloadTable
            });
        });

        // Callback for purchasing parts
        $(table).find('.button-buy').click(function() {
            var pk = $(this).attr('pk');

            launchModalForm('{% url "order-parts" %}', {
                data: {
                    parts: [
                        pk
                    ],
                },
            });
        });

        // Callback for displaying price
        $(table).find('.button-price').click(function() {
            var pk = $(this).attr('pk');
            var idx = $(this).closest('tr').attr('data-index');
            var row = $(table).bootstrapTable('getData')[idx];

            launchModalForm(
                '{% url "line-pricing" %}',
                {
                    submit_text: '{% trans "Calculate price" %}',
                    data: {
                        line_item: pk,
                        quantity: row.quantity,
                    },
                    buttons: [
                        {
                            name: 'update_price',
                            title: '{% trans "Update Unit Price" %}'
                        },
                    ],
                    success: reloadTable,
                }
            );
        });
    }

    $(table).inventreeTable({
        onPostBody: setupCallbacks,
        name: 'salesorderlineitems',
        sidePagination: 'server',
        formatNoMatches: function() {
            return '{% trans "No matching line items" %}';
        },
        queryParams: filters,
        original: options.params,
        url: options.url,
        showFooter: true,
        uniqueId: 'pk',
        detailView: show_detail,
        detailViewByClick: show_detail,
        detailFilter: function(index, row) {
            if (pending) {
                // Order is pending
                return row.allocated > 0;
            } else {
                return row.fulfilled > 0;
            }
        },
        detailFormatter: function(index, row, element) {
            if (pending) {
                return showAllocationSubTable(index, row, element, options);
            } else {
                return showFulfilledSubTable(index, row, element, options);
            }
        },
        columns: columns,
    });
}
