import { describe, it, expect } from "vitest"
import { successResponse, successResponseList, errorResponse, errorValidation, notFound, unauthorized, forbidden, requireRole } from "@/lib/api"

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe("successResponse", () => {
  it("returns 200 with data by default", async () => {
    const res = await parseResponse(successResponse({ id: "1" }))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toEqual({ id: "1" })
  })

  it("returns custom status code", async () => {
    const res = await parseResponse(successResponse({}, "Created", 201))
    expect(res.status).toBe(201)
    expect(res.body.message).toBe("Created")
  })

  it("includes message when provided", async () => {
    const res = await parseResponse(successResponse(null, "Success"))
    expect(res.body.message).toBe("Success")
  })
})

describe("successResponseList", () => {
  it("returns 200 with data array", async () => {
    const res = await parseResponse(successResponseList([{ id: "1" }]))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(1)
  })

  it("includes meta when provided", async () => {
    const meta = { total: 10, page: 1, limit: 10 }
    const res = await parseResponse(successResponseList([], meta))
    expect(res.body.meta).toEqual(meta)
  })
})

describe("errorResponse", () => {
  it("returns 400 with error message", async () => {
    const res = await parseResponse(errorResponse("Bad request"))
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe("Bad request")
  })

  it("returns custom status code", async () => {
    const res = await parseResponse(errorResponse("Server error", 500))
    expect(res.status).toBe(500)
  })
})

describe("errorValidation", () => {
  it("returns 422 with errors", async () => {
    const res = await parseResponse(errorValidation({ name: "Required" }))
    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.errors).toEqual({ name: "Required" })
  })

  it("includes custom message", async () => {
    const res = await parseResponse(errorValidation({}, "Custom message"))
    expect(res.body.message).toBe("Custom message")
  })
})

describe("notFound", () => {
  it("returns 404", async () => {
    const res = await parseResponse(notFound())
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it("returns custom message", async () => {
    const res = await parseResponse(notFound("User not found"))
    expect(res.body.message).toBe("User not found")
  })
})

describe("unauthorized", () => {
  it("returns 401", async () => {
    const res = await parseResponse(unauthorized())
    expect(res.status).toBe(401)
    expect(res.body.message).toBe("Unauthorized")
  })
})

describe("forbidden", () => {
  it("returns 403", async () => {
    const res = await parseResponse(forbidden())
    expect(res.status).toBe(403)
    expect(res.body.message).toBe("Forbidden")
  })
})

describe("requireRole", () => {
  it("returns false when userRole is undefined", () => {
    expect(requireRole(["ADMIN"])).toBe(false)
  })

  it("returns true when role is allowed", () => {
    expect(requireRole(["ADMIN", "DOSEN"], "DOSEN")).toBe(true)
  })

  it("returns false when role is not allowed", () => {
    expect(requireRole(["ADMIN"], "DOSEN")).toBe(false)
  })
})
