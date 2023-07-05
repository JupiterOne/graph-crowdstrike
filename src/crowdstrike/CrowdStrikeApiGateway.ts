export class CrowdStrikeApiGateway {
  public handleRedirects(response, handler, logger) {
    logger.info(
      {
        locationHeader: response.headers.get('location'),
        responseUrl: response.url,
      },
      'Encountered a redirect.',
    );

    const redirectLocationUrl = new URL(
      response.headers.get('location'),
      response.url,
    );

    const validUrls = /^api\.(\S+\.)?crowdstrike.com/;

    if (validUrls.test(redirectLocationUrl.host)) {
      return handler(redirectLocationUrl);
    } else {
      logger.warn(
        { redirectLocationUrl },
        `Encountered an invalid redirect location URL! Redirect prevented.`,
      );
    }
  }
}
