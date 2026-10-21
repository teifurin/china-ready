'use strict';
process.env.FLYAI_OFFLINE = '1';
process.env.MOCK_LLM = '1';
require('../src/server.js');
