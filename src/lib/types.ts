import type { Logger } from "pino";

export interface AppBindings {
	Variables: {
		logger: Logger;
	};
}
