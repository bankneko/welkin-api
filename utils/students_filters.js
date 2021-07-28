class APIFilters {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    filter() {
        const queryCopy = {...this.queryStr}

        // Removing fields from the query
        const removeFields = ['sort', 'fields', 'limit', 'page'];
        removeFields.forEach(element => delete queryCopy[element]);

        // Advanced filter using: lt(<), lte(<=), gt(>), gte(>=)
        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        if(this.queryStr.sort) {
            // Handling sorting multiple values
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            // If sort is not specify ps. to inverse sort put - infron (-sid)
            this.query = this.query.sort('sid');
        }
        return this;
    }

    limitFields() {
        if(this.queryStr.fields) {
            const fields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            // If not limit field, remove __v field
            this.query = this.query.select('-__v');
        }
        return this;
    }

    pagination() {
        const page = parseInt(this.queryStr.page, 10) || 1;
        const limit = parseInt(this.queryStr.limit, 10) || 25;
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFilters;