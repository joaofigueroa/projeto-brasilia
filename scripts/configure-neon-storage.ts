import "./environment";
import { GetBucketAclCommand, HeadBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { neonStorage } from "../src/server/integrations/neon-storage";

const { client, bucket } = neonStorage();
await client.send(new HeadBucketCommand({ Bucket: bucket }));
const acl = await client.send(new GetBucketAclCommand({ Bucket: bucket }));
if (acl.Grants?.some((grant) => grant.Grantee?.URI?.includes("AllUsers")))
  throw new Error("The CRM bucket must be private");
await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [
            "https://projeto-brasilia.vercel.app",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
          ],
          AllowedMethods: ["POST", "GET", "HEAD"],
          AllowedHeaders: ["content-type", "x-amz-meta-attachmentid"],
          ExposeHeaders: ["ETag", "Content-Length"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
console.log(`Private Neon bucket verified and CORS configured: ${bucket}`);
