/**
 * A resilient fetch wrapper providing timeout, retry, and circuit breaker capabilities.
 */

type CircuitStatus = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitState {
  status: CircuitStatus;
  failures: number;
  openUntil: number;
}

const circuitStates = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 5; // Trip after 5 consecutive failures
const OPEN_COOLDOWN_MS = 60000; // Stay open for 60 seconds

/**
 * Extracts the origin from a URL to manage circuit breaker state per host.
 */
const getOrigin = (url: string | URL): string => {
  try {
    return new URL(url).origin;
  } catch (e) {
    // For relative paths or invalid URLs, use a default key.
    return 'default';
  }
};

/**
 * Retrieves or initializes the circuit breaker state for a given origin.
 */
const getCircuitState = (origin: string): CircuitState => {
  if (!circuitStates.has(origin)) {
    circuitStates.set(origin, {
      status: 'CLOSED',
      failures: 0,
      openUntil: 0,
    });
  }
  return circuitStates.get(origin)!;
};

/**
 * Trips the circuit breaker to the OPEN state.
 */
const tripCircuit = (state: CircuitState, origin: string) => {
  state.status = 'OPEN';
  state.failures = 0; // Reset failures after tripping
  state.openUntil = Date.now() + OPEN_COOLDOWN_MS;
  console.warn(`[Resilience] Circuit breaker for ${origin} is now OPEN for ${OPEN_COOLDOWN_MS / 1000}s.`);
};

/**
 * Resets the circuit breaker to the CLOSED state.
 */
const resetCircuit = (state: CircuitState, origin: string) => {
  if (state.status !== 'CLOSED') {
    state.status = 'CLOSED';
    state.failures = 0;
    console.log(`[Resilience] Circuit breaker for ${origin} is now CLOSED.`);
  }
};

/**
 * Moves the circuit breaker to the HALF_OPEN state.
 */
const halfOpenCircuit = (state: CircuitState) => {
  state.status = 'HALF_OPEN';
};

export interface FetchWithResilienceOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

/**
 * Wraps the native fetch call with timeout, retry, circuit breaker, and rate-limiting handling.
 * @param url The URL to fetch.
 * @param options Configuration for resilience and standard fetch options.
 * @returns A Promise that resolves to a Response object.
 */
export async function fetchWithResilience(
  url: string | URL,
  options: FetchWithResilienceOptions = {}
): Promise<Response> {
  const { retries = 2, timeout = 30000, ...fetchOptions } = options;
  const totalAttempts = retries + 1;

  const origin = getOrigin(url);
  const circuitState = getCircuitState(origin);

  if (circuitState.status === 'OPEN') {
    if (Date.now() >= circuitState.openUntil) {
      halfOpenCircuit(circuitState);
    } else {
      throw new Error(`[Resilience] Circuit breaker is open for ${origin}. Request blocked.`);
    }
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...(fetchOptions as RequestInit),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 429 Too Many Requests
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        let delay = 1000 * Math.pow(2, attempt); // Default exponential backoff
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10);
          if (!isNaN(retryAfterSeconds)) {
            delay = retryAfterSeconds * 1000;
          } else {
            const retryDate = new Date(retryAfter).getTime();
            if (!isNaN(retryDate)) {
              delay = Math.max(0, retryDate - Date.now());
            }
          }
        }
        lastError = new Error(`[Resilience] API rate limit hit (429). Retrying after ${delay}ms.`);
        if (attempt < totalAttempts) {
          console.warn(lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue; // Move to the next attempt
      }

      // Handle other non-ok responses
      if (!response.ok) {
        throw new Error(`[Resilience] API request failed with status ${response.status}: ${await response.text()}`);
      }

      // On success, reset the circuit if it was HALF_OPEN or just reset failures
      resetCircuit(circuitState, origin);
      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        lastError = new Error(`[Resilience] Request timed out after ${timeout}ms.`);
      }

      circuitState.failures++;

      if (circuitState.status === 'HALF_OPEN') {
        tripCircuit(circuitState, origin);
        break; // Fail fast on HALF_OPEN failure
      }

      if (circuitState.failures >= FAILURE_THRESHOLD) {
        tripCircuit(circuitState, origin);
        break; // Circuit is now open, stop retrying
      }

      if (attempt < totalAttempts) {
        const backoff = 1000 * Math.pow(2, attempt - 1);
        console.warn(`[Resilience] Attempt ${attempt} failed for ${url.toString()}. Retrying in ${backoff}ms... Error: ${lastError?.message || 'Unknown error'}`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  throw new Error(`[Resilience] Request failed after ${totalAttempts} attempts. Last error: ${lastError?.message}`);
}