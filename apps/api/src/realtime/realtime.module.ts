import { Global, Module } from "@nestjs/common";
import { AdminGateway } from "./admin.gateway.js";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [AdminGateway],
  exports: [AdminGateway],
})
export class RealtimeModule {}
