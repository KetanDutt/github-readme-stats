import { describe, expect, it, jest } from "@jest/globals";
import { queryByTestId } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import {
  buildErrorCard,
  buildInputErrorCard,
  setSvgContentType,
} from "../src/common/api.js";
import { CustomError, MissingParamError } from "../src/common/error.js";

describe("api helpers", () => {
  it("setSvgContentType sets the SVG content type", () => {
    const res = { setHeader: jest.fn() };
    setSvgContentType(res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
  });

  it("buildInputErrorCard renders the message without the issue link", () => {
    const svg = buildInputErrorCard({
      colors: {},
      message: "Locale not found",
      secondaryMessage: "Choose a supported locale.",
    });

    document.body.innerHTML = svg;
    expect(queryByTestId(document.body, "message")).toHaveTextContent(
      "Locale not found",
    );
    expect(queryByTestId(document.body, "message")).toHaveTextContent(
      "Choose a supported locale.",
    );
    expect(svg).not.toContain("file an issue");
  });

  it("buildErrorCard hides the issue link for missing params", () => {
    const svg = buildErrorCard({
      err: new MissingParamError(["username"]),
      colors: {},
    });

    document.body.innerHTML = svg;
    expect(queryByTestId(document.body, "message")).toHaveTextContent(
      "Missing params",
    );
    expect(svg).not.toContain("file an issue");
  });

  it("buildErrorCard shows the issue link for unexpected errors", () => {
    const svg = buildErrorCard({
      err: new CustomError("Something exploded", CustomError.UNKNOWN),
      colors: {},
    });

    document.body.innerHTML = svg;
    expect(queryByTestId(document.body, "message")).toHaveTextContent(
      "Something exploded",
    );
    expect(svg).toContain("file an issue");
  });

  it("buildErrorCard handles unknown thrown values", () => {
    const svg = buildErrorCard({ err: "boom", colors: {} });

    document.body.innerHTML = svg;
    expect(queryByTestId(document.body, "message")).toHaveTextContent(
      "An unknown error occurred",
    );
  });

  it("buildErrorCard honors color options", () => {
    const svg = buildErrorCard({
      err: new CustomError("Nope", CustomError.UNKNOWN),
      colors: { bg_color: "000000", text_color: "ffffff" },
    });

    expect(svg).toContain("#000000");
    expect(svg).toContain("#ffffff");
  });
});
