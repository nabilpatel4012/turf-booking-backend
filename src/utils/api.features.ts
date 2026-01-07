import { SelectQueryBuilder, ObjectLiteral } from "typeorm";

export class APIFeatures<T extends ObjectLiteral> {
  query: SelectQueryBuilder<T>;
  queryString: any;

  constructor(query: SelectQueryBuilder<T>, queryString: any) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `:${match}`);

    const parsedQuery = JSON.parse(queryStr);
    
    // Iterate over keys and apply WHERE clause dynamically
    Object.keys(parsedQuery).forEach(key => {
        const value = parsedQuery[key];
        // Handle simple equality or operators
        // Note: This is a basic implementation. For complex nested objects or specific TypeORM operators,
        // more logic is needed. Here we assume flat structure or handle specific known operators.
        
        // Example: price[gte]=100 -> price >= 100
        // TypeORM doesn't natively parse "gte" from query string like Mongoose.
        // We need to map it.
        
        if (typeof value === 'object' && value !== null) {
            Object.keys(value).forEach(operator => {
                const val = value[operator];
                const paramKey = `${key}_${operator}`;
                if (operator === ':gte') {
                    this.query.andWhere(`${this.query.alias}.${key} >= :${paramKey}`, { [paramKey]: val });
                } else if (operator === ':gt') {
                    this.query.andWhere(`${this.query.alias}.${key} > :${paramKey}`, { [paramKey]: val });
                } else if (operator === ':lte') {
                    this.query.andWhere(`${this.query.alias}.${key} <= :${paramKey}`, { [paramKey]: val });
                } else if (operator === ':lt') {
                    this.query.andWhere(`${this.query.alias}.${key} < :${paramKey}`, { [paramKey]: val });
                }
            });
        } else {
             // Simple equality
             const paramKey = `${key}_eq`;
             this.query.andWhere(`${this.query.alias}.${key} = :${paramKey}`, { [paramKey]: value });
        }
    });

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      // sortBy = "price -createdAt" -> need to parse for TypeORM
      // TypeORM: .orderBy("user.name", "ASC").addOrderBy("user.id", "DESC")
      
      const sortFields = this.queryString.sort.split(",");
      sortFields.forEach((field: string, index: number) => {
          let order: "ASC" | "DESC" = "ASC";
          let key = field;
          if (field.startsWith("-")) {
              order = "DESC";
              key = field.substring(1);
          }
          
          if (index === 0) {
              this.query.orderBy(`${this.query.alias}.${key}`, order);
          } else {
              this.query.addOrderBy(`${this.query.alias}.${key}`, order);
          }
      });
      
    } else {
      this.query.orderBy(`${this.query.alias}.created_at`, "DESC");
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",");
      // TypeORM select: .select(["user.id", "user.name"])
      const selectFields = fields.map((field: string) => `${this.query.alias}.${field}`);
      this.query.select(selectFields);
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query.skip(skip).take(limit);

    return this;
  }
}
