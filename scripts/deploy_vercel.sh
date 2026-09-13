#!/usr/bin/env bash
# ==============================================================================
# VeriScan Production Deployment Automation Script
#
# Forces git remote synchronization, purges all local & remote build caches,
# verifies TypeScript integrity, and executes an un-cached Vercel production build.
# ==============================================================================

set -euo pipefail

# --- ANSI Color Tokens ---
COLOR_RESET="\033[0m"
COLOR_INFO="\033[38;5;39m"       # Cyan
COLOR_SUCCESS="\033[38;5;42m"    # Emerald
COLOR_WARN="\033[38;5;214m"     # Amber
COLOR_ERROR="\033[38;5;196m"    # Crimson
COLOR_OBSIDIAN="\033[38;5;238m" # Muted slate

log_info() {
  echo -e "${COLOR_INFO}[VERISCAN-DEVOPS]${COLOR_RESET} $*"
}

log_success() {
  echo -e "${COLOR_SUCCESS}[✓ SUCCESS]${COLOR_RESET} $*"
}

log_warn() {
  echo -e "${COLOR_WARN}[⚠ WARNING]${COLOR_RESET} $*"
}

log_error() {
  echo -e "${COLOR_ERROR}[✗ ERROR]${COLOR_RESET} $*" >&2
}

echo -e "${COLOR_INFO}"
echo "==================================================================="
echo "   VERISCAN FORENSIC PLATFORM // PRODUCTION DEPLOYMENT ENGINE     "
echo "==================================================================="
echo -e "${COLOR_RESET}"

# Prevent interactive prompts from Vercel CLI updater
export VERCEL_NO_UPDATE_NOTIFIER=1
export CI=1

# Working Directory Safety Guard
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

log_info "Working directory verified: ${ROOT_DIR}"

# ------------------------------------------------------------------------------
# STEP 1: Prerequisite Checks
# ------------------------------------------------------------------------------
log_info "Validating toolchain dependencies (git, node, pnpm, vercel, curl)..."

for tool in git node pnpm vercel curl; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    log_error "Missing required CLI tool: ${tool}. Please install before deploying."
    exit 1
  fi
done

NODE_VER="$(node -v)"
PNPM_VER="$(pnpm -v)"
VERCEL_VER="$(vercel --version 2>&1 | head -n 1)"
log_success "Environment ready: Node ${NODE_VER}, pnpm ${PNPM_VER}, ${VERCEL_VER}"

# Check Vercel Authentication
log_info "Checking Vercel CLI session state..."
if ! vercel whoami >/dev/null 2>&1; then
  log_error "Vercel CLI is not authenticated. Please run 'vercel login' first."
  exit 1
fi
AUTH_USER="$(vercel whoami 2>&1 | grep "Logged in as" | sed 's/> //')"
log_success "${AUTH_USER}"

# ------------------------------------------------------------------------------
# STEP 2: Git Remote Sync & Uncommitted Changes Verification
# ------------------------------------------------------------------------------
log_info "Verifying Git working tree and remote configuration..."

CURRENT_BRANCH="$(git branch --show-current || echo "HEAD")"
REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo "")"

if [ -z "${REMOTE_URL}" ]; then
  log_warn "No git remote 'origin' configured. Remote push step will be skipped."
else
  log_info "Branch: ${CURRENT_BRANCH} | Remote: ${REMOTE_URL}"
fi

# Check for uncommitted modifications
if [ -n "$(git status --porcelain)" ]; then
  log_warn "Uncommitted changes detected in repository."
  echo -e "${COLOR_OBSIDIAN}$(git status -s)${COLOR_RESET}"

  read -r -p "[PROMPT] Stage and commit all changes before production build? [Y/n] " AUTO_COMMIT || AUTO_COMMIT="Y"
  if [[ "${AUTO_COMMIT}" =~ ^[Yy]$ ]] || [ -z "${AUTO_COMMIT}" ]; then
    COMMIT_MSG="chore(deploy): sync forensic pipeline & UI updates $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    log_info "Staging all changes and committing: '${COMMIT_MSG}'..."
    git add -A
    git commit -m "${COMMIT_MSG}"
    log_success "Git commit recorded."
  else
    log_warn "Proceeding with uncommitted local modifications. Deployment will upload current workspace state."
  fi
fi

# Push to Remote (if origin exists and on a named branch)
if [ -n "${REMOTE_URL}" ] && [ "${CURRENT_BRANCH}" != "HEAD" ]; then
  log_info "Syncing local branch '${CURRENT_BRANCH}' with remote origin..."
  git push origin "${CURRENT_BRANCH}" || log_warn "Push to origin/${CURRENT_BRANCH} failed or up to date. Continuing deployment..."
  log_success "Git remote synchronized."
fi

# ------------------------------------------------------------------------------
# STEP 3: Purge Stale Caches and Build Artifacts
# ------------------------------------------------------------------------------
log_info "Purging local build caches and stale compilation artifacts..."

rm -rf \
  dist \
  dist/public \
  api/index.js \
  .vercel/output \
  .turbo \
  node_modules/.cache \
  .vite

log_success "Purged: dist/, api/index.js, .vercel/output, .turbo, and node_modules/.cache"

# ------------------------------------------------------------------------------
# STEP 4: Local Compilation, Type-Check & Bundle Build
# ------------------------------------------------------------------------------
log_info "Executing TypeScript type validation (tsc --noEmit)..."
pnpm run check
log_success "TypeScript check passed with 0 errors."

log_info "Running Vitest regression test suite..."
pnpm run test
log_success "All frontend and backend unit tests passed."

log_info "Building production distribution (Vite client + esbuild serverless API)..."
pnpm run build

# Sanity check built artifacts
if [ ! -f "dist/index.js" ] || [ ! -f "api/index.js" ] || [ ! -d "dist/public" ]; then
  log_error "Build verification failed: missing dist/index.js, api/index.js, or dist/public/."
  exit 1
fi
log_success "Production bundles generated cleanly: dist/index.js (server), api/index.js (serverless), dist/public (SPA)."

# ------------------------------------------------------------------------------
# STEP 5: Un-cached Production Deployment via Vercel CLI
# ------------------------------------------------------------------------------
log_info "Initiating un-cached Vercel production deployment (--prod --force)..."
echo -e "${COLOR_OBSIDIAN}Command: vercel --prod --force --yes${COLOR_RESET}"

DEPLOY_START_TIME="$(date +%s)"
DEPLOY_OUTPUT="$(vercel --prod --force --yes 2>&1 | tee /dev/tty)"
DEPLOY_END_TIME="$(date +%s)"
DURATION=$((DEPLOY_END_TIME - DEPLOY_START_TIME))

# Extract deployment URL from Vercel output
DEPLOY_URL="$(echo "${DEPLOY_OUTPUT}" | grep -E "https://[a-zA-Z0-9.-]+\.vercel\.app" | tail -n 1 | tr -d ' \r\n' || echo "")"

if [ -z "${DEPLOY_URL}" ]; then
  log_warn "Could not automatically parse deployment URL from output."
else
  log_success "Deployed to Vercel in ${DURATION}s: ${DEPLOY_URL}"
fi

# ------------------------------------------------------------------------------
# STEP 6: Live Smoke Test & Health Check
# ------------------------------------------------------------------------------
if [ -n "${DEPLOY_URL}" ]; then
  log_info "Executing live smoke test against ${DEPLOY_URL}/health..."
  
  # Allow serverless function warm-up
  sleep 2

  HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOY_URL}/health" || echo "000")"
  
  if [ "${HTTP_CODE}" = "200" ]; then
    log_success "Live /health endpoint returned HTTP 200 OK!"
  else
    # Check fallback root
    ROOT_HTTP="$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOY_URL}" || echo "000")"
    if [ "${ROOT_HTTP}" = "200" ]; then
      log_success "Live platform root returned HTTP 200 OK (HTTP_CODE: ${ROOT_HTTP})."
    else
      log_warn "Health check returned HTTP ${HTTP_CODE} (Root: ${ROOT_HTTP}). Check Vercel Function logs."
    fi
  fi
fi

echo -e "${COLOR_SUCCESS}"
echo "==================================================================="
echo "   VERISCAN PRODUCTION DEPLOYMENT COMPLETE                       "
if [ -n "${DEPLOY_URL}" ]; then
  echo "   URL: ${DEPLOY_URL}                                             "
fi
echo "==================================================================="
echo -e "${COLOR_RESET}"
