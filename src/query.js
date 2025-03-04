import utils from './utils.js'
import graph from './graph.js'
import build from './build.js'
import hashes from './hashes.js'
import versioning from './versioning.js'

// Check for valid query response
function valid_response(x) {
  return (x !== null) && (x !== undefined) && (x.length > 0)
}

// Query all available projects
async function projects(network="mainnet") {
  const { projects } = await graph.artblocks_subgraph(
`{
  projects(first: 1000, orderBy: projectId) {
    projectId
    name
    artistName
    contract {
      id
    }
  }
}
`, network)

  // Parse data
  let data = []
  if (valid_response(projects)) {
    for (let project of projects) {
      data.push({
        id : project.projectId,
        name : project.name,
        artist : project.artistName,
        contract : project.contract.id
      })
    }
  }
  return(data)
}

// Query project metadata
async function project_metadata(id, network="mainnet") {
  const { projects } = await graph.artblocks_subgraph(
`{
  projects(where: { projectId: "${id}" }) {
    projectId
    name
    artistName
    curationStatus
    description
    license
    website
    paused
    complete
    locked
    currencySymbol
    pricePerTokenInWei
    invocations
    maxInvocations
    contract {
      id
    }
  }
}
`, network)

  // Parse data
  let data = {}
  if (valid_response(projects)) {
    let project = projects[0]
    data.id = project.projectId
    data.name = project.name
    data.artist = project.artistName
    data.curation_status = project.curationStatus
    data.description = project.description
    data.license = project.license
    data.website = project.website
    data.paused = project.paused
    data.complete = project.complete
    data.locked = project.locked
    data.currency_symbol = project.currencySymbol == null ? "ETH" : project.currencySymbol
    data.price_eth = utils.wei_to_eth(parseInt(project.pricePerTokenInWei, 10))
    data.invocations = parseInt(project.invocations, 10)
    data.invocations_max = parseInt(project.maxInvocations, 10)
    data.contract = project.contract.id
  }
  return data
}

// Query project raw script
async function project_script(id, network="mainnet") {
  const { projects } = await graph.artblocks_subgraph(
`{
  projects(where: { projectId: "${id}" }) {
    projectId
    name
    scriptUpdatedAt
    scriptJSON
    script
  }
}
`, network)

  // Parse data
  let data = {}
  if (valid_response(projects)) {
    let project = projects[0]
    project.scriptJSON = JSON.parse(project.scriptJSON)
    data.id = project.projectId
    data.name = project.name
    data.last_updated = project.scriptUpdatedAt
    data.dependency = project.scriptJSON.type
    data.dependency_version = project.scriptJSON.version
    data.dependency_tag = versioning.dependency(project.scriptJSON.type)
    data.interactive = project.scriptJSON.interactive
    data.animation_length_sec = project.scriptJSON.animationLengthInSeconds
    data.instructions = project.scriptJSON.instructions
    data.script = project.script
  }
  return data
}

// Query token metadata
async function token_metadata(id, network="mainnet") {
  const { tokens } = await graph.artblocks_subgraph(
`{
  tokens(where: { tokenId: "${id}" }) {
    project {
      projectId
      name
    }
    tokenId
    invocation
    hash
  }
}
`, network)

  // Parse data
  let data = {}
  if (valid_response(tokens)) {
    let token = tokens[0]
    data.project_id = token.project.projectId
    data.project_name = token.project.name
    data.token_id = token.tokenId
    data.token_invocation = token.invocation
    data.token_hash = token.hash
  }
  return data
}

// Query token raw script with hash and dependency tags
async function token_script(id, network="mainnet") {
  const { tokens } = await graph.artblocks_subgraph(
`{
  tokens(where: { tokenId: "${id}"}) {
    project {
      projectId
      scriptJSON
      script
    }
    tokenId
    invocation
    hash
  }
}
`, network)

  // Parse data
  let data = {}
  if (valid_response(tokens)) {
    let token = tokens[0]
    token.project.scriptJSON = JSON.parse(token.project.scriptJSON)
    data = {}
    data.token_id = token.tokenId
    data.token_invocation = token.invocation
    data.token_dependencies = []
    data.token_dependencies.push({
      "type": "script",
      "url": versioning.dependency(token.project.scriptJSON.type)
    })
    data.token_data = hashes.hash(parseInt(token.project.projectId, 10), token.tokenId, token.hash)
    data.token_script = token.project.script
  }
  return data
}

// Query token generator html file
async function token_generator(id, network="mainnet") {
  const { tokens } = await graph.artblocks_subgraph(
`{
  tokens(where: { tokenId: "${id}"}) {
    project {
      projectId
      scriptJSON
      script
    }
    tokenId
    hash
  }
}
`, network)

  // Parse data
  let html = ""
  if (valid_response(tokens)) {
    let token = tokens[0]
    let type = JSON.parse(token.project.scriptJSON).type
    let token_data = hashes.hash(parseInt(token.project.projectId, 10), token.tokenId, token.hash)
    let dependency = versioning.dependency(type)
    let script = token.project.script
    html = build.template(type, token_data, script, dependency)
  }
  return html
}

export default {
  projects,
  project_metadata,
  project_script,
  token_metadata,
  token_script,
  token_generator
}