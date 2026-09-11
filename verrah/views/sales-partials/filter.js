<%
/*
 * This partial filters ONLY the currently selected tab.
 *
 * The controller supplies:
 *   activeTab
 *   activeFilterDate
 *   activeFilterPeriod
 *   filterLabel
 *
 * Query names are tab-specific:
 *   summaryDate / summaryPeriod
 *   productsDate / productsPeriod
 *   arrearsDate / arrearsPeriod
 *
 * Therefore filtering Product Analytics cannot modify
 * Sales Summary or Customer Arrears.
 */
%>

<form
    class="sales-filter"
    method="GET"
    action="/sales"
>

    <input
        type="hidden"
        name="tab"
        value="<%= activeTab %>"
    >

    <div class="sales-filter-field">

        <label for="sales-filter-date">
            Date
        </label>

        <input
            id="sales-filter-date"
            type="date"
            name="<%= activeTab %>Date"
            value="<%= activeFilterDate %>"
            required
        >

    </div>


    <div class="sales-filter-field">

        <label for="sales-filter-period">
            Period
        </label>

        <select
            id="sales-filter-period"
            name="<%= activeTab %>Period"
        >

            <option
                value="day"
                <%= activeFilterPeriod === "day" ? "selected" : "" %>
            >
                Day
            </option>

            <option
                value="month"
                <%= activeFilterPeriod === "month" ? "selected" : "" %>
            >
                Month
            </option>

            <option
                value="year"
                <%= activeFilterPeriod === "year" ? "selected" : "" %>
            >
                Year
            </option>

        </select>

    </div>


    <button
        type="submit"
        class="sales-filter-button"
    >
        Apply Filter
    </button>


    <a
        href="/sales?tab=<%= activeTab %>"
        class="sales-filter-clear"
    >
        Reset
    </a>

</form>
