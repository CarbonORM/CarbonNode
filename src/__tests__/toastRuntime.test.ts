import {afterEach, describe, expect, it, vi} from "vitest";

import {notifyToast, setToastHandler} from "../api/utils/toastRuntime";

describe("toastRuntime", () => {
    afterEach(() => {
        setToastHandler(null);
    });

    it("no-ops when no handler is registered", () => {
        expect(() => notifyToast("success", "hello")).not.toThrow();
    });

    it("dispatches to the registered handler", () => {
        const handler = vi.fn();
        setToastHandler(handler);

        notifyToast("error", "boom", {autoClose: 10});

        expect(handler).toHaveBeenCalledWith("error", "boom", {autoClose: 10});
    });
});
