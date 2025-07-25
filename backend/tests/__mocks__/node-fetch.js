const fetchMock = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ content: '' }),
  text: async () => ''
}));

module.exports = fetchMock;
module.exports.default = fetchMock;
