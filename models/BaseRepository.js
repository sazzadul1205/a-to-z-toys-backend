export function createBaseRepository(collectionName) {
  return {
    collectionName,
    async findAll() {
      throw new Error("Not implemented");
    },
    async findById(id) {
      throw new Error("Not implemented");
    },
    async findOne(predicate) {
      throw new Error("Not implemented");
    },
    async find(predicate) {
      throw new Error("Not implemented");
    },
    async create(data) {
      throw new Error("Not implemented");
    },
    async updateById(id, data) {
      throw new Error("Not implemented");
    },
    async deleteById(id) {
      throw new Error("Not implemented");
    },
    async exists(predicate) {
      const found = await this.findOne(predicate);
      return !!found;
    },
  };
}