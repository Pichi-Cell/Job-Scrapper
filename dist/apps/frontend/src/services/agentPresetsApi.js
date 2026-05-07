export async function fetchAgentPreset(preset, signal) {
    const requestInit = {};
    if (signal !== undefined) {
        requestInit.signal = signal;
    }
    const response = await fetch(`/api/v1/jobs/agent-presets/${preset}`, requestInit);
    const payload = (await response.json());
    if (!response.ok || payload.error !== null) {
        throw new Error(payload.error ?? `Request failed with status ${response.status}`);
    }
    return payload.data;
}
