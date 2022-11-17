const knex = require('../../../../../drivers/knex-product-read');

module.exports.findScubs = async (productIds) => {
  if (!productIds.length) {
    return {};
  }

  const [rows] = await knex.raw(
    `
        select ps.productId, ps.scubId, s.weight
        from \`service.product-scub-mapping\`.products_scubs ps
        left join \`service.scub\`.scubs s on ps.scubId=s.id
        where ps.productId IN (${productIds.map(() => '?').join(', ')})
    `,
    [...productIds]
  );

  return rows.reduce((memo, row) => {
    if (!memo[row.productId]) {
      // eslint-disable-next-line no-param-reassign
      memo[row.productId] = [];
    }

    memo[row.productId].push({
      scubId: row.scubId,
      weight: row.weight
    });

    return memo;
  }, {});
};
