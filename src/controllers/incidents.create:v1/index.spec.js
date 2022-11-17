const sinon = require('sinon');
const { expect } = require('chai');
const { BadRequestError } = require('@devcubyn/core.errors');
const IncidentModel = require('../../modules/models/incident');
const IncidentRequesterModel = require('../../modules/models/incident-requester');
const {
  INCIDENT_TYPES,
  RECIPIENT_INCIDENT_TYPES
} = require('../../modules/incident/domain/incident');
const { handler: lambda } = require('.');
const { BadConcernQuantityError } = require('../../modules/incident/errors');
const IncidentConcernModel = require('../../modules/models/incident-concern');
const { ORIGIN_TYPES, BaseIncident } = require('../../modules/incident/domain/incident/base');

const buildContext = (ownerId = false) => {
  if (ownerId) {
    return {
      permissions: {
        'incident.create': [{ ownerId: [ownerId] }]
      }
    };
  }

  return {};
};

describe('controllers/incidents.create:v1', () => {
  const USER_PID_1 = 10001;
  const USER_PID_2 = 10002;

  const PAYLOAD = {
    type: INCIDENT_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE,
    entityId: 'PRODUCT-001',
    entityType: 'PRODUCT',
    origin: ORIGIN_TYPES.SHIPPER,
    attachments: [{ type: 'BUYING_INVOICE', fileKey: 's3://invoice.pdf' }]
  };

  const REQUESTER = {
    firstName: 'test',
    lastName: 'test',
    email: 'test@cubyn.com',
    bankInfo: '{}',
    language: 'en'
  };

  const PRODUCT = {
    id: 'PRODUCT-001',
    sku: 'SKU',
    name: 'my sku',
    ownerId: USER_PID_1,
    scubId: 'SCUB-001'
  };

  const ITEM = {
    id: 'ITEM-001',
    status: 'DAMAGED'
  };

  let sqlProductRepository;
  let rpcProductRepository;
  let itemRepository;
  let documentValidationRepository;
  let messageRepository;
  let repositories;

  beforeEach(() => {
    documentValidationRepository = {
      validate: sinon.spy(async () => ({ id: 'DOCUMENT_VALIDATION_ID' }))
    };
    sqlProductRepository = {
      findById: sinon.spy(async () => ({
        ...PRODUCT,
        children: [
          {
            sku: 'SKU_DAMAGED',
            name: 'my sku',
            flag: 'DAMAGED',
            ownerId: USER_PID_1,
            scubId: 'SCUB-002'
          }
        ]
      }))
    };
    rpcProductRepository = {
      findProductsByScubId: sinon.spy(async () => [PRODUCT])
    };
    itemRepository = {
      getItemsDamagedAfter: sinon.spy(async () => [ITEM.id]),
      findByIds: sinon.spy(async () => [ITEM]),
      damagedItems: sinon.spy(async () => [{ itemId: ITEM.id }])
    };
    messageRepository = {
      claimCreated: sinon.spy(async () => {})
    };
    repositories = {
      documentValidationRepository,
      itemRepository,
      messageRepository,
      sqlProductRepository,
      rpcProductRepository
    };
  });

  afterEach(async () => {
    await IncidentModel.query().delete();
    await IncidentRequesterModel.query().delete();
  });

  it('should refuse impersonation and continue with scoped ownerId from permissions', async () => {
    const request = {
      data: {
        body: {
          ...PAYLOAD,
          ownerId: USER_PID_2
        }
      },
      context: buildContext(USER_PID_1)
    };

    await lambda(request, { ...repositories });

    const { ownerId } = await IncidentModel.query().first();
    expect(ownerId).to.eql(USER_PID_1);
  });

  describe('non dry-run scenario', () => {
    it('should create a new incident on connected user', async () => {
      const request = {
        data: {
          body: { ...PAYLOAD }
        },
        context: buildContext(USER_PID_1)
      };

      await lambda(request, { ...repositories });

      // incident should have been created in local db
      const incidents = await IncidentModel.query().eager('[attachments, concerns]');
      expect(incidents).to.have.length(1);
      const [incident] = incidents;
      expect(incident.attachments).to.have.length(1);
      expect(incident.concerns).to.have.length(1);
      expect(incident.ownerId).to.eql(USER_PID_1);

      // document validation should have been requested
      expect(documentValidationRepository.validate.calledOnce).to.be.true;
      expect(sqlProductRepository.findById.called).to.be.true;
    });

    it('should create a new incident on impersonated user', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            ownerId: USER_PID_1
          }
        },
        context: buildContext()
      };

      await lambda(request, { ...repositories });

      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(1);
      expect(incidents[0].ownerId).to.eql(USER_PID_1);
    });

    it('should create a requester when source is recipient', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            source: 'RECIPIENT',
            requester: REQUESTER
          }
        },
        context: buildContext()
      };

      await lambda(request, { ...repositories });

      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(1);
      const requesters = await IncidentRequesterModel.query();
      expect(requesters).to.have.length(1);
      expect(requesters[0].firstName).to.eql('test');
      expect(requesters[0].language).to.exist;
      expect(requesters[0].language).to.equal(REQUESTER.language);
    });

    it('should raise error when trying to create requester for shipper type', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            source: 'SHIPPER',
            ownerId: USER_PID_1,
            requester: REQUESTER
          }
        },
        context: buildContext()
      };

      await expect(lambda(request, { ...repositories })).to.be.rejectedWith(
        BadRequestError,
        /No requester for shipper/
      );

      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(0);
      const requesters = await IncidentRequesterModel.query();
      expect(requesters).to.have.length(0);
    });

    it('should raise error when trying to create recipient without requester', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            source: 'RECIPIENT',
            ownerId: USER_PID_1
          }
        },
        context: buildContext()
      };

      await expect(lambda(request, { ...repositories })).to.be.rejectedWith(
        BadRequestError,
        /Missing requester details/
      );

      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(0);
      const requesters = await IncidentRequesterModel.query();
      expect(requesters).to.have.length(0);
    });

    it('should create a new incident on item type damaged', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            ownerId: USER_PID_1,
            entityType: BaseIncident.ENTITY_TYPES.ITEM
          }
        },
        context: buildContext()
      };

      await lambda(request, { ...repositories });

      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(1);
    });

    it('should create a new incident on item type lost', async () => {
      ITEM.status = 'LOST';
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            type: INCIDENT_TYPES.PRODUCT_LOST_IN_WAREHOUSE,
            ownerId: USER_PID_1,
            entityType: BaseIncident.ENTITY_TYPES.ITEM
          }
        },
        context: buildContext()
      };

      await lambda(request, { ...repositories });

      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(1);
    });

    describe('when concerns are provided', () => {
      RECIPIENT_INCIDENT_TYPES.forEach((type) => {
        it(`should accept only concerns with quantity > 0 for type ${type}`, async () => {
          const request = {
            data: {
              body: {
                ...PAYLOAD,
                type,
                requester: REQUESTER,
                source: 'RECIPIENT',
                concerns: [
                  {
                    entityId: 'PRODUCT-001',
                    entityType: 'PRODUCT',
                    type: 'MERCHANDISE',
                    quantity: 0
                  },
                  {
                    entityId: 'PRODUCT-002',
                    entityType: 'PRODUCT',
                    type: 'MERCHANDISE',
                    quantity: 1
                  }
                ]
              }
            },
            context: buildContext()
          };
          await expect(lambda(request, { ...repositories })).to.be.rejectedWith(
            BadConcernQuantityError
          );
        });

        it('should accept concerns if all good', async () => {
          const request = {
            data: {
              body: {
                ...PAYLOAD,
                type,
                requester: REQUESTER,
                source: 'RECIPIENT',
                concerns: [
                  {
                    entityId: 'PRODUCT-001',
                    entityType: 'PRODUCT',
                    type: 'MERCHANDISE',
                    quantity: 1
                  },
                  {
                    entityId: 'PRODUCT-002',
                    entityType: 'PRODUCT',
                    type: 'MERCHANDISE',
                    quantity: 3
                  }
                ]
              }
            },
            context: buildContext()
          };
          await lambda(request, { ...repositories });
          const concerns = await IncidentConcernModel.query();
          expect(concerns).to.have.length(2);
        });
      });
    });
  });

  describe('dry-run scenario', () => {
    it('should preprocess incident on connected user', async () => {
      const request = {
        data: {
          body: { ...PAYLOAD },
          query: { 'dry-run': true }
        },
        context: buildContext(USER_PID_1)
      };

      const { body } = await lambda(request, { ...repositories });

      // nothing in db
      const incidents = await IncidentModel.query().eager('[attachments, concerns]');
      expect(incidents).to.have.length(0);

      // body is detailed preprocessing checks
      expect(body.success).to.be.true;
      expect(body.checks).to.have.length(3);
    });

    it('should create a new incident on impersonated user', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            ownerId: USER_PID_1
          },
          query: { 'dry-run': true }
        },
        context: buildContext()
      };

      const { body } = await lambda(request, { ...repositories });

      // nothing in db
      const incidents = await IncidentModel.query().eager('[attachments, concerns]');
      expect(incidents).to.have.length(0);

      // body is detailed preprocessing checks
      expect(body.success).to.be.true;
      expect(body.checks).to.have.length(3);
    });
  });
});
