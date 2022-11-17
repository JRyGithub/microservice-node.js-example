const knex = require('../../../../../drivers/knex-product-read');

const PRODUCT_FIELDS = [
  'id',
  'ownerId',
  'name',
  'sku',
  'flag',
  'isVirtual',
  'isBundle',
  'isUnknown'
];

module.exports.findProductById = async (id) => {
  const [rows] = await knex.raw(
    `
        SELECT target.id as id
            , target.ownerId as ownerId
            , target.name as name
            , target.sku as sku
            , target.flag as flag
            , target.isVirtual as isVirtual
            , target.isBundle as isBundle
            , target.isUnknown as isUnknown

            , parent.id as parent_id
            , parent.ownerId as parent_ownerId
            , parent.name as parent_name
            , parent.sku as parent_sku
            , parent.flag as parent_flag
            , parent.isVirtual as parent_isVirtual
            , parent.isBundle as parent_isBundle
            , parent.isUnknown as parent_isUnknown

            , child.id as child_id
            , child.ownerId as child_ownerId
            , child.name as child_name
            , child.sku as child_sku
            , child.flag as child_flag
            , child.isVirtual as child_isVirtual
            , child.isBundle as child_isBundle
            , child.isUnknown as child_isUnknown

        FROM \`service.product\`.products target

            LEFT JOIN \`service.product\`.productFlagMapping childMapping
                ON childMapping.parentProductId = target.id
            LEFT JOIN \`service.product\`.products child
                ON child.id = childMapping.productId

            LEFT JOIN \`service.product\`.productFlagMapping parentMapping
                ON parentMapping.productId = target.id
            LEFT JOIN \`service.product\`.products parent
                ON parent.id = parentMapping.parentProductId

        WHERE target.id = ?
    `,
    [id]
  );

  if (!rows.length) {
    return null;
  }

  return {
    ...parseProduct(rows[0]),
    parent: parseProduct(rows[0], 'parent_'),
    children: rows.map((row) => row && parseProduct(row, 'child_')).filter((child) => !!child)
  };
};

function parseProduct(row, prefix = '') {
  if (!row[`${prefix}id`]) {
    return null;
  }

  return PRODUCT_FIELDS.reduce((memo, field) => {
    // eslint-disable-next-line no-param-reassign
    memo[field] = row[`${prefix}${field}`];

    return memo;
  }, {});
}
