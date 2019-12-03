declare module "@pollyjs/persister-fs" {
  import { Har } from "har-format";
  import { Polly } from "@pollyjs/core";
  import Persister from "@pollyjs/persister";

  export default class FSPersister extends Persister {
    constructor(polly: Polly);
    public saveRecording(recordingId: number, data: Har): void;
  }
}
