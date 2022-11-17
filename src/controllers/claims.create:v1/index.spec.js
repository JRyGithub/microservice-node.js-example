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
const { USER_TYPES, BaseIncident } = require('../../modules/incident/domain/incident/base');
const { AttachmentValidation } = require('../../modules/incident/domain/attachment-validation');

const buildContext = (ownerId = false) => {
  if (ownerId) {
    return {
      permissions: {
        'incident.create': [{ ownerId: [ownerId] }]
      },
      user: {
        id: ownerId,
        roles: Object.values(USER_TYPES)
      }
    };
  }

  return {};
};

describe('controllers/claims.create:v1', () => {
  const USER_PID_1 = 10001;
  const USER_PID_2 = 10002;

  const PAYLOAD = {
    type: INCIDENT_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE,
    entityId: 'PRODUCT-001',
    entityType: BaseIncident.ENTITY_TYPES.PRODUCT,
    origin: USER_TYPES.SHIPPER,
    attachments: [{ type: AttachmentValidation.TYPES.BUYING_INVOICE, fileKey: 's3://invoice.pdf' }]
  };

  const REQUESTER = {
    firstName: 'test',
    lastName: 'test',
    email: 'test@cubyn.com',
    bankInfo: '{}',
    language: 'en'
  };

  let productRepository;
  let itemRepository;
  let documentValidationRepository;
  let messageRepository;
  let parcelRepository;
  let repositories;

  beforeEach(() => {
    documentValidationRepository = {
      validate: sinon.spy(async () => ({ id: 'DOCUMENT_VALIDATION_ID' }))
    };
    productRepository = {
      findById: sinon.spy(async () => ({
        sku: 'SKU',
        name: 'my sku',
        ownerId: USER_PID_1,
        scubId: 'SCUB-001',
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
    itemRepository = {
      getItemsDamagedAfter: sinon.spy(async () => ['ITEM-001'])
    };
    messageRepository = {
      claimCreated: sinon.spy(async () => {})
    };
    parcelRepository = {
      findById: sinon.spy(async () => ({
        shipperId: USER_PID_1
      }))
    };
    repositories = {
      documentValidationRepository,
      itemRepository,
      messageRepository,
      sqlProductRepository: productRepository,
      parcelRepository
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
      expect(productRepository.findById.called).to.be.true;
    });

    it('should not create a new incident on impersonated user', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            ownerId: USER_PID_1
          }
        },
        context: buildContext()
      };
      let error;

      try {
        await lambda(request, { ...repositories });
      } catch (innerError) {
        error = innerError;
      }

      expect(error).to.be.instanceOf(BadRequestError);
    });

    it('should create a requester when source is recipient', async () => {
      const request = {
        data: {
          body: {
            ...PAYLOAD,
            entityType: BaseIncident.ENTITY_TYPES.PARCEL,
            source: USER_TYPES.RECIPIENT,
            requester: REQUESTER,
            relatedShipperId: USER_PID_1
          }
        },
        context: buildContext(USER_PID_1)
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
            source: USER_TYPES.SHIPPER,
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
            entityType: BaseIncident.ENTITY_TYPES.PARCEL,
            source: USER_TYPES.RECIPIENT,
            relatedShipperId: USER_PID_1
          }
        },
        context: buildContext(USER_PID_1)
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

    describe('when concerns are provided', () => {
      RECIPIENT_INCIDENT_TYPES.forEach((type) => {
        it(`should accept only concerns with quantity > 0 for type ${type}`, async () => {
          const request = {
            data: {
              body: {
                ...PAYLOAD,
                type,
                entityType: BaseIncident.ENTITY_TYPES.PARCEL,
                requester: REQUESTER,
                source: USER_TYPES.RECIPIENT,
                relatedShipperId: USER_PID_1,
                concerns: [
                  {
                    entityId: 'PRODUCT-001',
                    entityType: BaseIncident.ENTITY_TYPES.PRODUCT,
                    type: 'MERCHANDISE',
                    quantity: 0
                  },
                  {
                    entityId: 'PRODUCT-002',
                    entityType: BaseIncident.ENTITY_TYPES.PRODUCT,
                    type: 'MERCHANDISE',
                    quantity: 1
                  }
                ]
              }
            },
            context: buildContext(USER_PID_1)
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
                source: USER_TYPES.RECIPIENT,
                entityType: BaseIncident.ENTITY_TYPES.PARCEL,
                relatedShipperId: USER_PID_1,
                concerns: [
                  {
                    entityId: 'PRODUCT-001',
                    entityType: BaseIncident.ENTITY_TYPES.PRODUCT,
                    type: 'MERCHANDISE',
                    quantity: 1
                  },
                  {
                    entityId: 'PRODUCT-002',
                    entityType: BaseIncident.ENTITY_TYPES.PRODUCT,
                    type: 'MERCHANDISE',
                    quantity: 3
                  }
                ]
              }
            },
            context: buildContext(USER_PID_1)
          };
          await lambda(request, { ...repositories });
          const concerns = await IncidentConcernModel.query();
          expect(concerns).to.have.length(2);
        });
      });
    });
  });
});
