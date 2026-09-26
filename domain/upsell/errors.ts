/** A rule violation whose message (pt-BR) can be shown to staff or to the client as is. */
export class UpsellError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpsellError";
  }
}
