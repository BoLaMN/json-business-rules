ops = []

ops.push require('./filter').ops...
ops.push require('./update').ops...

module.exports = ops
