const nock = require('nock');
const sinon = require('sinon');
const zendeskTicket = require('./ticket');
const ZendeskUserService = require('./user');
const zendeskOrganization = require('./organization');
const env = require('../../env');

const zendeskUser = ZendeskUserService.prototype;

const zendeskDomain = env.ZENDESK_DOMAIN;

describe('[utils/zendesk/ticket]', () => {
  describe('[validateCollaborators]', () => {
    it('should validate all emails', () => {
      const res = zendeskTicket.validateCollaborators(['toto@cubyn.com', 'nono@cubyn.io']);
      expect(res).to.be.an('array').to.deep.equal(['toto@cubyn.com', 'nono@cubyn.io']);
    });

    it('should throw if a non email is detected', () => {
      expect(() =>
        zendeskTicket.validateCollaborators(['toto@cubyn.com', 'nono@@cubyn.io'])
      ).to.be.throw(Error, 'The CC field is not valid');
    });

    it('should work with an empty array', () => {
      const res = zendeskTicket.validateCollaborators();
      expect(res).to.be.an('array').to.deep.equal([]);
    });
  });

  describe('[parseFiles]', () => {
    it('should return a list of files', () => {
      const res = zendeskTicket.parseFiles({
        SHIPCLAIMS: [
          {
            fileKey: 'toto.x',
            fileName: 'tete',
            url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
          }
        ]
      });
      expect(res).to.deep.equal([
        {
          fileKey: 'toto.x',
          fileName: 'SHIPCLAIMS_tete',
          url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
        }
      ]);
    });

    it('should be ok', () => {
      const res = zendeskTicket.parseFiles({
        SHIPCLAIMS: [
          {
            fileKey: 'toto.x',
            fileName: 'tete',
            url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
          }
        ],
        RECCLAIMS: []
      });
      expect(res).to.deep.equal([
        {
          fileKey: 'toto.x',
          fileName: 'SHIPCLAIMS_tete',
          url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
        }
      ]);
    });
  });

  describe('[createZendeskAttachment]', () => {
    it('should not create an attachment if the filetype is not reconized', () => {
      return expect(
        zendeskTicket.createZendeskAttachment({
          fileName: 'toto.xptdf'
        })
      ).to.be.rejectedWith(Error, 'Attachment is not supported');
    });

    it('should upload a file to zendesk', async () => {
      const createAttachment = nock(`https://${zendeskDomain}.zendesk.com`)
        .post('/api/v2/uploads.json')
        .query({ filename: 'file.pdf' })
        .reply(201, {
          upload: {
            token: '6bk3gql82em5nmf',
            attachment: {
              id: 498483,
              name: 'file.pdf',
              content_url: `https://${zendeskDomain}.zendesk.com/attachments/file.pdf`,
              content_type: 'application/pdf',
              size: 1340,
              thumbnails: []
            },
            attachments: [
              {
                id: 498483,
                name: 'file.pdf',
                content_url: `https://${zendeskDomain}.zendesk.com/attachments/file.pdf`,
                content_type: 'application/pdf',
                size: 1340,
                thumbnails: []
              }
            ]
          }
        });
      const fileToUpload = {
        fileName: 'file.pdf',
        fileKey: 'uploads/file',
        url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
      };
      const result = await zendeskTicket.createZendeskAttachment(fileToUpload);
      expect(createAttachment.isDone()).to.be.true;
      expect(result).to.equal('6bk3gql82em5nmf');
    });

    it('should reject if status is different from 201', async () => {
      const createAttachment = nock(`https://${zendeskDomain}.zendesk.com`)
        .post('/api/v2/uploads.json')
        .query({ filename: 'file.pdf' })
        .reply(202, {
          upload: {
            token: '6bk3gql82em5nmf',
            attachment: {
              id: 498483,
              name: 'file.pdf',
              content_url: `https://${zendeskDomain}.zendesk.com/attachments/file.pdf`,
              content_type: 'application/pdf',
              size: 1340,
              thumbnails: []
            },
            attachments: [
              {
                id: 498483,
                name: 'file.pdf',
                content_url: `https://${zendeskDomain}.zendesk.com/attachments/file.pdf`,
                content_type: 'application/pdf',
                size: 1340,
                thumbnails: []
              }
            ]
          }
        });
      const fileToUpload = {
        fileName: 'file.pdf',
        fileKey: 'uploads/file',
        url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
      };

      return expect(
        zendeskTicket.createZendeskAttachment(fileToUpload).catch((err) => {
          expect(createAttachment.isDone()).to.be.true;
          throw err;
        })
      ).to.be.rejectedWith(Error);
    });
  });

  describe('[getTags]', () => {
    it('should return empty array', async () => {
      const invoke = () => [];

      expect(await zendeskTicket.getTags('', invoke)).to.deep.equal([]);
    });

    it('should return built string', async () => {
      const invoke = () => [
        { message: 'erreur de tri' },
        { message: 'livraison a ete reprogrammee' },
        { message: 'livre' }
      ];

      const result = ['erreur_de_tri', 'reexpedition_client', 'livre', 'anomalie'];

      expect(await zendeskTicket.getTags('', invoke)).to.deep.equal(result);
    });
  });

  describe('[create]', () => {
    beforeEach(() => {
      nock(`https://${zendeskDomain}.zendesk.com`)
        .post('/api/v2/tickets.json')
        .reply(200, (_uri, requestBody) => {
          return {
            ticket: {
              id: '12314',
              description: requestBody.ticket.description,
              subject: requestBody.ticket.subject,
              created_at: 'date',
              updated_at: 'date'
            }
          };
        });
    });

    before(() => {
      sinon.stub(zendeskTicket, 'createZendeskAttachment').callsFake(async () => '123');
      sinon.stub(zendeskUser, 'findOrCreateFromEmails').callsFake(async (emails = [], org) => {
        return emails.map((email) => ({
          external_id: email,
          name: email,
          organization_id: org.id
        }));
      });
      sinon.stub(zendeskUser, 'findOrCreate').callsFake(async (user, org) => {
        return {
          external_id: user.email,
          name:
            user.lastName && user.firstName
              ? `${user.lastName} ${user.firstName}`
              : user.organizationName,
          email: user.email,
          organization_id: org ? org.id : '1'
        };
      });
      sinon.stub(zendeskOrganization, 'findOrCreate').callsFake(async (org) => ({
        id: 123,
        external_id: org.id,
        name: org.organizationName || org.id
      }));
    });

    after(() => {
      zendeskTicket.createZendeskAttachment.restore();
      zendeskUser.findOrCreateFromEmails.restore();
      zendeskUser.findOrCreate.restore();
      zendeskOrganization.findOrCreate.restore();
      // request.restore();
    });

    it('should create a simple attachment', async () => {
      const result = await zendeskTicket.create({
        type: 'ORDER',
        ticket: {
          reason: 'prob',
          comment: 'lambda - damaged parcel',
          fileMap: {
            invoices: [
              {
                fileName: 'cn.pdf',
                fileKey: 'uploads/cn',
                url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
              }
            ],
            picturesOfTheDamage: [
              {
                fileName: 'file.pdf',
                fileKey: 'uploads/file',
                url: 'https://s3-eu-west-1.amazonaws.com/cubyn.dev/test-target.png'
              }
            ],
            identityParts: [],
            certificateOfNonReceipt: [],
            senderDisputeDeclaration: [],
            others: []
          },
          requester: 'metux@cubyn.com',
          collaborators: ['mathieu@cubyn.com']
        },
        user: {
          id: 277206218,
          firstName: 'Mathieu',
          lastName: 'Lemaire',
          address: {
            line1: '27 rue du Chemin Vert',
            zip: '75011',
            city: 'Paris',
            country: 'FR'
          },
          organizationName: 'totox',
          phone: '0664543537',
          createdAt: '2016-08-10T08:16:49.000Z',
          updatedAt: '2016-08-10T08:16:49.000Z',
          email: 'mathieu@cubyn.com',
          affiliateCode: 'Lemaire-8YC16F4'
        },
        data: {
          id: 868170120,
          type: 'SHIPMENT',
          trackingId: 'CUB868170120',
          status: 'PICKED',
          aside: false,
          organizationName: 'Cubynux',
          address: {
            line1: '1 IMPASSE DES FAUX',
            zip: '86240',
            city: 'Iteuil',
            country: 'FR'
          },
          firstName: 'LAURENT',
          lastName: 'BARBAGLIA',
          phone: '681867184',
          email: 'jeromelizon@packlink.fr',
          value: 0,
          deliveryMode: 'colissimo',
          deliverySigned: false,
          objectCount: 1,
          insurance: 100,
          orderRef: 'FR006H27N8315AC',
          createdAt: '2016-08-24T13:44:36.000Z',
          updatedAt: '2016-09-13T16:10:15.000Z',
          shippedAt: '2016-09-13T16:10:15.000Z',
          selfReturnActivated: false,
          customsCategory: 'GIFT',
          originalValue: 0,
          collectId: 942069196
        },
        publish: sinon.spy()
      });

      expect(result).to.have.properties({
        id: '12314',
        subject: 'CUB868170120 - LAURENT BARBAGLIA (Cubynux) - prob',
        referenceId: 868170120
      });
    });

    it('should create a simple attachment without files', async () => {
      const result = await zendeskTicket.create({
        type: 'ORDER',
        ticket: {
          reason: 'prob',
          comment: ''
        },
        user: {
          id: 277206218,
          firstName: 'Mathieu',
          lastName: 'Lemaire',
          address: {
            line1: '27 rue du Chemin Vert',
            zip: '75011',
            city: 'Paris',
            country: 'FR'
          },
          organizationName: 'totox',
          phone: '0664543537',
          createdAt: '2016-08-10T08:16:49.000Z',
          updatedAt: '2016-08-10T08:16:49.000Z',
          email: 'mathieu@cubyn.com',
          affiliateCode: 'Lemaire-8YC16F4'
        },
        data: {
          id: 868170120,
          type: 'SHIPMENT',
          trackingId: 'CUB868170120',
          status: 'PICKED',
          aside: false,
          address: {
            line1: '1 IMPASSE DES FAUX',
            zip: '86240',
            city: 'Iteuil',
            country: 'FR'
          },
          firstName: 'LAURENT',
          lastName: 'BARBAGLIA',
          phone: '681867184',
          email: 'jeromelizon@packlink.fr',
          value: 0,
          deliveryMode: 'colissimo',
          deliverySigned: false,
          objectCount: 1,
          insurance: 100,
          orderRef: 'FR006H27N8315AC',
          createdAt: '2016-08-24T13:44:36.000Z',
          updatedAt: '2016-09-13T16:10:15.000Z',
          shippedAt: '2016-09-13T16:10:15.000Z',
          selfReturnActivated: false,
          customsCategory: 'GIFT',
          originalValue: 0,
          collectId: 942069196
        },
        publish: sinon.spy()
      });

      expect(result).to.have.properties({
        id: '12314',
        subject: 'CUB868170120 - LAURENT BARBAGLIA - prob',
        referenceId: 868170120
      });
    });
  });
});
